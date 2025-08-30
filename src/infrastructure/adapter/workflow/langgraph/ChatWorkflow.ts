import {Injectable} from '@nestjs/common';
import {StateGraph, START, END} from '@langchain/langgraph';
import {ChatOpenAI} from '@langchain/openai';
import {BaseMessage, HumanMessage, AIMessage, SystemMessage} from '@langchain/core/messages';
import {ChatStateAnnotation, WorkflowExecutionConfig, ChatGraphState} from './state/ChatWorkflowState';
import {LLMConfig} from '@infrastructure/config/LLMConfig';

@Injectable()
export class ChatWorkflow {
  private llm: ChatOpenAI;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private graph: any;

  constructor() {
    this.initializeLLM();
    this.buildGraph();
  }

  private initializeLLM(): void {
    const model: string = LLMConfig.DEFAULT_MODEL;

    this.llm = new ChatOpenAI({
      model: model,
      temperature: LLMConfig.TEMPERATURE,
      maxTokens: LLMConfig.MAX_TOKENS,
      streaming: true,
      openAIApiKey: LLMConfig.OPENAI_API_KEY,
      ...(LLMConfig.OPENAI_API_BASE && {
        configuration: {
          baseURL: LLMConfig.OPENAI_API_BASE,
        },
      }),
    });
  }

  private buildGraph(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workflow: any = new StateGraph(ChatStateAnnotation)
      .addNode('agent', this.chatNode.bind(this))
      .addEdge(START, 'agent')
      .addEdge('agent', END);

    this.graph = workflow.compile();
  }

  private async chatNode(state: ChatGraphState): Promise<Partial<ChatGraphState>> {
    try {
      const response: AIMessage = await this.llm.invoke(state.messages as BaseMessage[]) as AIMessage;

      return {
        messages: [response],
      };
    } catch (error) {
      // Return empty messages array for error state
      return {
        messages: [],
      };
    }
  }

}