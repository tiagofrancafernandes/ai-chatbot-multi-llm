import { Module, Global } from '@nestjs/common';
import { LlmService } from './llm.service';
import { OllamaProvider } from './providers/ollama.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { LmStudioProvider } from './providers/lmstudio.provider';

@Global()
@Module({
    providers: [
        OllamaProvider,
        GeminiProvider,
        OpenAiProvider,
        LmStudioProvider,
        LlmService,
    ],
    exports: [LlmService],
})
export class LlmModule {}
