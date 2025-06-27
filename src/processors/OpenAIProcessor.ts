import { BaseResponseProcessor, ProcessorResult, RiskExplanation } from './ResponseProcessor';
import { CollectedData } from '../providers/DataCollector';
import OpenAI from 'openai';
import { Config } from '../config/Config';

interface ConversationSession {
  sessionId: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  createdAt: Date;
  lastActivity: Date;
}

export class OpenAIProcessor extends BaseResponseProcessor {
  private client: OpenAI;
  private config: any;
  private sessions: Map<string, ConversationSession> = new Map();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  constructor() {
    super();
    this.config = Config.getInstance().getOpenAIConfig();
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: this.config.timeout,
      maxRetries: this.config.retries,
    });
  }

  getName(): string {
    return 'openai';
  }

  async process(address: string, addressType: string, collectedData: CollectedData): Promise<ProcessorResult> {
    try {
      if (!this.config.enabled) {
        return {
          score: 50,
          explanations: [{
            text: 'OpenAI analysis disabled',
            type: 'neutral'
          }]
        };
      }

      if (!process.env.OPENAI_API_KEY) {
        return {
          score: 50,
          explanations: [{
            text: 'OpenAI API key not configured',
            type: 'neutral'
          }]
        };
      }

      // Create a new session for this assessment
      const sessionId = this.createSession(address);
      
      // Initialize conversation with rules
      await this.initializeConversation(sessionId);
      
      // Send contract data for analysis
      await this.sendContractData(sessionId, address, addressType, collectedData);
      
      // Request risk assessment
      const assessment = await this.requestRiskAssessment(sessionId);
      
      // Clean up session
      this.cleanupSession(sessionId);
      
      return assessment;

    } catch (error) {
      console.error('OpenAI processor error:', error);
      return {
        score: 50,
        explanations: [{
          text: `OpenAI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'neutral'
        }]
      };
    }
  }

  private createSession(address: string): string {
    const sessionId = `session_${address}_${Date.now()}`;
    const session: ConversationSession = {
      sessionId,
      messages: [],
      createdAt: new Date(),
      lastActivity: new Date()
    };
    this.sessions.set(sessionId, session);
    return sessionId;
  }

  private async initializeConversation(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const systemPrompt = this.buildSystemPrompt();
    
    session.messages.push({
      role: 'system',
      content: systemPrompt
    });

    session.lastActivity = new Date();
  }

  private async sendContractData(sessionId: string, address: string, addressType: string, collectedData: CollectedData): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const dataSummary = this.prepareDataSummary(collectedData);
    
    const userMessage = `Contract Analysis Request:

Address: ${address}
Type: ${addressType}

Contract Data:
${dataSummary}

Please analyze this contract data according to the risk assessment rules I provided.`;

    session.messages.push({
      role: 'user',
      content: userMessage
    });

    session.lastActivity = new Date();
  }

  private async requestRiskAssessment(sessionId: string): Promise<ProcessorResult> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const assessmentRequest = `Based on the contract data I provided, please calculate the risk assessment.

Please respond with a JSON object in the following format:
{
  "score": <risk score 0-100>,
  "level": "<low|medium|high|critical>",
  "explanations": [
    {
      "text": "<explanation of risk factor>",
      "type": "<increase|decrease|neutral>"
    }
  ],
  "riskFactors": [
    {
      "category": "<category name>",
      "risk": "<risk level>",
      "details": "<specific details>"
    }
  ]
}

Consider all the rules I provided and explain your reasoning for each risk factor.`;

    session.messages.push({
      role: 'user',
      content: assessmentRequest
    });

    session.lastActivity = new Date();

    // Make API call
    const response = await this.client.chat.completions.create({
      model: this.config.model || 'gpt-4o',
      messages: session.messages,
      max_tokens: this.config.maxTokens || 2000,
      temperature: this.config.temperature || 0.2,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    // Parse the response
    try {
      const assessment = JSON.parse(content);
      
      return {
        score: assessment.score || 50,
        explanations: assessment.explanations || [{
          text: 'AI analysis completed',
          type: 'neutral'
        }],
        rawResponse: content
      };
    } catch (parseError) {
      // If JSON parsing fails, return the raw content
      return {
        score: 50,
        explanations: [{
          text: `Raw OpenAI Response: ${content}`,
          type: 'neutral'
        }],
        rawResponse: content
      };
    }
  }

  public buildSystemPrompt(): string {
    const riskConfig = Config.getInstance().getRiskAssessmentConfig();
    
    return `You are a blockchain risk assessment expert. Analyze token contracts based on the following comprehensive rules using standardized data:

## 1. DEX Volume & Holders
- > $${(riskConfig.volume24h.low / 1000000).toFixed(1)}M 24h volume → Very Low Risk
- $${(riskConfig.volume24h.medium / 1000).toFixed(0)}K–$${(riskConfig.volume24h.low / 1000000).toFixed(1)}M → Moderate Risk  
- < $${(riskConfig.volume24h.high / 1000).toFixed(0)}K → High Risk
- > ${riskConfig.holdersCount.low.toLocaleString()} holders → Very Low Risk
- ${riskConfig.holdersCount.medium}–${riskConfig.holdersCount.low.toLocaleString()} → Moderate Risk
- < ${riskConfig.holdersCount.high} → High Risk

## 2. Twitter Mentions & Influencers
- > ${riskConfig.twitterMentions.low.toLocaleString()} organic mentions/7d → Low Risk
- < ${riskConfig.twitterMentions.high} mentions/7d → High Risk
- Engagement Ratio < ${riskConfig.engagementRatio.botRisk} → Bot Risk ***
- >${riskConfig.scamKeywords.redFlag} scam keywords/7d → Red Flag

## 3. AMLBot Score (Deployer)
- no risk data -> Low Risk
- 0–${riskConfig.amlbotScore.low} → Clean → Low Risk
- ${riskConfig.amlbotScore.low + 1}–${riskConfig.amlbotScore.medium} → Moderate → Medium Risk
- ${riskConfig.amlbotScore.high + 1}–100 → High-Risk Entity → High/Critical

## 4. Token Concentration
- > ${riskConfig.top3ClustersPercentage.critical}% held by top 3 wallets → Critical Risk
- ${riskConfig.top3ClustersPercentage.high}–${riskConfig.top3ClustersPercentage.critical}% → High Risk
- ${riskConfig.top3ClustersPercentage.medium}–${riskConfig.top3ClustersPercentage.high}% → Medium Risk
- < ${riskConfig.top3ClustersPercentage.low}% → Low Risk
- Top 5 share the same cluster → Red Flag

## 5. Top 10 Holders Percentage
- < ${riskConfig.top10HoldersPercentage.low}% held by top 10 holders → Low Risk
- ${riskConfig.top10HoldersPercentage.low}–${riskConfig.top10HoldersPercentage.medium}% → Medium Risk
- > ${riskConfig.top10HoldersPercentage.high}% held by top 10 holders → High Risk

## 6. Token Age
- < ${riskConfig.tokenAge.high} days → High Risk ***
- ${riskConfig.tokenAge.medium}–${riskConfig.tokenAge.low} days → Medium Risk
- > ${riskConfig.tokenAge.low} days → Normal Risk

## 7. Market Cap & FDV
- > $${(riskConfig.marketCap.low / 1000000).toFixed(0)}M Market Cap → Low Risk
- $${(riskConfig.marketCap.medium / 1000000).toFixed(0)}M–$${(riskConfig.marketCap.low / 1000000).toFixed(0)}M → Moderate Risk
- $${(riskConfig.marketCap.high / 1000000).toFixed(0)}M–$${(riskConfig.marketCap.medium / 1000000).toFixed(0)}M → High Risk
- < $${(riskConfig.marketCap.critical / 1000000).toFixed(0)}M → Very High Risk
- FDV < ${riskConfig.fullyDilutedValuation.low}x Market Cap → Healthy
- FDV ${riskConfig.fullyDilutedValuation.low}x–${riskConfig.fullyDilutedValuation.medium}x Market Cap → Acceptable
- FDV > ${riskConfig.fullyDilutedValuation.high}x Market Cap → Red Flag
- FDV > ${riskConfig.fullyDilutedValuation.high}x TVL → Inefficient Capital

## Data Format
The data will be provided in a standardized format with the following fields:
- price: Current token price in USD
- volume24h: 24-hour trading volume in USD
- marketCap: Market capitalization in USD
- fullyDilutedValuation: FDV in USD
- txCount24h: Number of transactions in last 24h
- liquidity: Total liquidity in USD
- amlbotScore: AMLBot risk score (0-1)
- decentralizationScore: Decentralization score (0-100)

Always provide detailed reasoning for your risk assessment. If data is missing for any category, note it in your analysis. Use the standardized data when available for more accurate assessment.`;
  }

  private prepareDataSummary(collectedData: CollectedData): string {
    const summary: any = {};

    // Use common data if available, otherwise fall back to raw data
    if (collectedData.commonData) {
      summary.commonData = collectedData.commonData;
    }

    // Also include raw data for reference
    if (collectedData.amlbot?.status === 'success' && collectedData.amlbot.rawData) {
      const amlData = collectedData.amlbot.rawData;
      summary.amlbot = {
        riskScore: amlData.riskscore,
        transactionCount: amlData.addressDetailsData?.n_txs,
        signals: amlData.signals
      };
    }

    if (collectedData.coingecko?.status === 'success' && collectedData.coingecko.rawData) {
      const cgData = collectedData.coingecko.rawData;
      summary.coingecko = {
        marketCap: cgData.market_data?.market_cap?.usd,
        volume: cgData.market_data?.total_volume?.usd,
        priceChange24h: cgData.market_data?.price_change_percentage_24h,
        twitterFollowers: cgData.community_data?.twitter_followers
      };
    }

    if (collectedData.dexscreener?.status === 'success' && collectedData.dexscreener.rawData) {
      const dexData = collectedData.dexscreener.rawData;
      if (dexData.length > 0) {
        const bestPair = dexData.reduce((best: any, current: any) => {
          return (current.liquidity?.usd || 0) > (best.liquidity?.usd || 0) ? current : best;
        });
        summary.dexscreener = {
          liquidity: bestPair.liquidity?.usd,
          volume24h: bestPair.volume?.h24,
          priceChange24h: bestPair.priceChange?.h24,
          transactions24h: (bestPair.txns?.h24?.buys || 0) + (bestPair.txns?.h24?.sells || 0)
        };
      }
    }

    if (collectedData.bubblemap?.status === 'success' && collectedData.bubblemap.rawData) {
      const bubblemapData = collectedData.bubblemap.rawData;
      summary.bubblemap = {
        decentralizationScore: bubblemapData.decentralization_score,
        clusters: bubblemapData.clusters?.length,
        identifiedSupply: bubblemapData.metadata?.identified_supply,
        topHolders: bubblemapData.clusters?.slice(0, 5).map((cluster: any) => ({
          percentage: cluster.percentage,
          clusterId: cluster.cluster_id
        }))
      };
    }

    // Add top 10 holders percentage from common data if available
    if (collectedData.bubblemap?.status === 'success' && collectedData.bubblemap.commonData) {
      const commonData = collectedData.bubblemap.commonData;
      if (commonData.top10HoldersPercentage !== undefined) {
        summary.top10HoldersPercentage = commonData.top10HoldersPercentage;
      }
    }

    return JSON.stringify(summary, null, 2);
  }

  private cleanupSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  // Cleanup old sessions periodically
  private cleanupOldSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now.getTime() - session.lastActivity.getTime() > this.SESSION_TIMEOUT) {
        this.sessions.delete(sessionId);
      }
    }
  }

  // Public method to get session info (for debugging)
  getSessionInfo(sessionId: string): ConversationSession | undefined {
    return this.sessions.get(sessionId);
  }

  // Public method to get active session count
  getActiveSessionCount(): number {
    this.cleanupOldSessions();
    return this.sessions.size;
  }
} 