import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
    const logger = new Logger('Bootstrap');
    const app = await NestFactory.create(AppModule);

    app.enableCors({
        origin: '*',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: false,
        })
    );

    const configService = app.get(ConfigService);
    const configuredPort = configService.get<string>('PORT') || configService.get<string>('BACKEND_PORT');
    const port = Number(configuredPort) || 3000;

    await app.listen(port);
    logger.log(`NestJS server running at: http://localhost:${port}`);
}

bootstrap();
