import { Injectable, Logger } from '@nestjs/common';
import { JsonDatabaseService } from '../database/json-database.service';
import { LlmService } from '../llm/llm.service';
import { KnowledgeBaseData } from '../common/interfaces/knowledge.interface';
import { UpdateKnowledgeDto } from './dto/update-knowledge.dto';

@Injectable()
export class KnowledgeService {
    private readonly logger = new Logger(KnowledgeService.name);

    constructor(
        private readonly databaseService: JsonDatabaseService,
        private readonly llmService: LlmService
    ) {}

    public getKnowledgeBase(): KnowledgeBaseData {
        return this.databaseService.getKnowledgeBase();
    }

    public async updateKnowledge(dto: UpdateKnowledgeDto): Promise<KnowledgeBaseData> {
        const companyRules = (dto.companyRules || '').trim();
        const additionalInstructions = (dto.additionalInstructions || '').trim();

        const cachedSummary = await this.compileKnowledgeSummary(companyRules, additionalInstructions);

        const updatedData: KnowledgeBaseData = {
            companyRules,
            additionalInstructions,
            cachedSummary,
            lastCompiledAt: Date.now(),
        };

        const saved = this.databaseService.saveKnowledgeBase(updatedData);

        this.logger.log(
            `Knowledge base updated and cache summary compiled at ${new Date(saved.lastCompiledAt).toISOString()}`
        );

        return saved;
    }

    public async rebuildCache(): Promise<KnowledgeBaseData> {
        const currentData = this.getKnowledgeBase();

        const cachedSummary = await this.compileKnowledgeSummary(
            currentData.companyRules,
            currentData.additionalInstructions
        );

        const updatedData: KnowledgeBaseData = {
            ...currentData,
            cachedSummary,
            lastCompiledAt: Date.now(),
        };

        const saved = this.databaseService.saveKnowledgeBase(updatedData);

        this.logger.log(
            `Knowledge cache manually recompiled and refreshed at ${new Date(saved.lastCompiledAt).toISOString()}`
        );

        return saved;
    }

    public async compileKnowledgeSummary(companyRules: string, additionalInstructions: string): Promise<string> {
        const combinedContent = [
            '### Regras e Informações Gerais da Empresa:',
            companyRules,
            '',
            '### Instruções Adicionais e Exceções:',
            additionalInstructions || 'Nenhuma instrução adicional temporária no momento.',
        ].join('\n');

        const systemInstruction =
            'Você é um assistente de sintetização de conhecimento empresarial em português do Brasil.\n' +
            'Resuma as diretrizes mantendo SEMPRE em tópicos concisos:\n' +
            '- Endereço físico completo (logradouro, número, cidade, CEP);\n' +
            '- Dias e horários de atendimento presencial e online;\n' +
            '- Suporte e formas de pagamento;\n' +
            '- Avisos ou exceções temporárias com datas e detalhes.\n' +
            'Mantenha todos os dados fáticos e seja direto.';

        const prompt = `Consolide as seguintes informações em um resumo compacto para uso rápido pelo chatbot:\n\n${combinedContent}`;

        try {
            const generatedSummary = await this.llmService.generateText(
                prompt,
                systemInstruction,
                undefined,
                'qwen2.5:0.5b'
            );

            if (
                generatedSummary &&
                generatedSummary.trim().length > 20 &&
                !generatedSummary.startsWith('Service notice:')
            ) {
                return generatedSummary.trim();
            }
        } catch (error) {
            this.logger.warn(
                `LLM text generation failed for knowledge compilation: ${(error as Error).message}. Applying deterministic condensation fallback.`
            );
        }

        return this.deterministicFallbackSummary(companyRules, additionalInstructions);
    }

    private deterministicFallbackSummary(companyRules: string, additionalInstructions: string): string {
        const parts: string[] = [];

        if (companyRules) {
            const condensedRules = companyRules
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line.length > 0)
                .join('. ');

            parts.push(condensedRules);
        }

        if (additionalInstructions) {
            const condensedAdditional = additionalInstructions
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line.length > 0)
                .join('. ');

            parts.push(`Avisos / Exceções: ${condensedAdditional}`);
        }

        if (parts.length === 0) {
            return 'Horário comercial: Segunda a Sexta, das 08h às 18h. Suporte via chat e canais digitais.';
        }

        return parts.join(' | ');
    }
}
