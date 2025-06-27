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

  private buildSystemPrompt(): string {
    return `You are a blockchain risk assessment expert. Analyze token contracts based on the following comprehensive rules:

## 1. DEX Volume & Holders
- > $1M 24h volume → Very Low Risk
- $100K–$1M → Moderate Risk  
- < $100K → High Risk
- > 2,000 holders → Very Low Risk
- 300–2,000 → Moderate Risk
- < 300 → High Risk

## 2. Twitter Mentions & Influencers
- > 5,000 organic mentions/7d → Low Risk
- < 500 mentions/7d → High Risk
- Engagement Ratio < 0.3 → Bot Risk ***
- >5 scam keywords/7d → Red Flag

## 3. AMLBot Score (Deployer)
- 0–30 → Clean → Low Risk
- 31–70 → Moderate → Medium Risk
- 71–100 → High-Risk Entity → High/Critical

## 4. Token Concentration
- > 80% held by top 3 wallets → Critical Risk
- 50–80% → High Risk
- 20–50% → Medium Risk
- < 20% → Low Risk
- Top 5 share the same cluster → Red Flag

## 5. Token Age
- < 7 days → High Risk ***
- 7–30 days → Medium Risk
- > 30 days → Normal Risk

## 6. Market Cap & FDV
- > $100M Market Cap → Low Risk
- $10M–$100M → Moderate Risk
- $1M–$10M → High Risk
- < $1M → Very High Risk
- FDV < 3x Market Cap → Healthy
- FDV 3x–10x Market Cap → Acceptable
- FDV > 10x Market Cap → Red Flag
- FDV > 10x TVL → Inefficient Capital

Always provide detailed reasoning for your risk assessment. If data is missing for any category, note it in your analysis.`;
  }

  private prepareDataSummary(collectedData: CollectedData): string {
    const summary: any = {};

    // AMLBot data
    if (collectedData.amlbot?.status === 'success' && collectedData.amlbot.rawData) {
      const amlData = collectedData.amlbot.rawData;
      summary.amlbot = {
        riskScore: amlData.riskscore,
        transactionCount: amlData.addressDetailsData?.n_txs,
        signals: amlData.signals
      };
    }

    // Coingecko data
    if (collectedData.coingecko?.status === 'success' && collectedData.coingecko.rawData) {
      const cgData = collectedData.coingecko.rawData;
      summary.coingecko = {
        marketCap: cgData.market_data?.market_cap?.usd,
        volume: cgData.market_data?.total_volume?.usd,
        priceChange24h: cgData.market_data?.price_change_percentage_24h,
        twitterFollowers: cgData.community_data?.twitter_followers
      };
    }

    // DexScreener data
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

    // Bubblemap data
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