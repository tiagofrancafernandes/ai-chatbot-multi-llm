import { Module, Global } from '@nestjs/common';
import { JsonDatabaseService } from './json-database.service';

@Global()
@Module({
    providers: [JsonDatabaseService],
    exports: [JsonDatabaseService],
})
export class DatabaseModule {}
