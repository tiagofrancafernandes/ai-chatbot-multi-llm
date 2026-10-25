import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { JsonDatabaseService } from '../database/json-database.service';
import { Customer } from '../common/interfaces/customer.interface';
import { Plan } from '../common/interfaces/plan.interface';
import { BusinessHours } from '../common/interfaces/business-hours.interface';

@Injectable()
export class CustomerService {
    constructor(private readonly databaseService: JsonDatabaseService) {}

    public getAllCustomers(): Customer[] {
        return this.databaseService.getCustomers();
    }

    public getCustomerById(id: string): Customer {
        if (!id) {
            throw new BadRequestException('Customer ID must be provided');
        }

        const customer = this.databaseService.findCustomerByIdentifier(id);

        if (!customer) {
            throw new NotFoundException(`Customer with identifier "${id}" not found`);
        }

        return customer;
    }

    public saveCustomer(customer: Customer): Customer {
        if (!customer) {
            throw new BadRequestException('Customer payload cannot be empty');
        }

        if (!customer.id) {
            throw new BadRequestException('Customer ID is required');
        }

        return this.databaseService.saveCustomer(customer);
    }

    public getPlans(): Plan[] {
        return this.databaseService.getPlans();
    }

    public getBusinessHours(): BusinessHours {
        return this.databaseService.getBusinessHours();
    }
}
