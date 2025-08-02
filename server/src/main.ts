import { NestFactory } from '@nestjs/core';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';

// Charger les variables d'environnement
dotenv.config();

const DEFAULT_PORT = 3000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for Angular frontend
  app.enableCors({
    origin: ['http://localhost:4000', 'http://localhost:4200'], // Angular dev server and production
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  });

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_PORT;
  await app.listen(port);
  console.log(`NestJS server listening on http://localhost:${port}`);
}
bootstrap();
