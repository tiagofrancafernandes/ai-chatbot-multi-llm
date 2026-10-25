import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { Customer } from '../common/interfaces/customer.interface';

@Controller('api')
export class CustomerController {
    constructor(private readonly customerService: CustomerService) {}

    @Get('customers')
    public getCustomers(): Customer[] {
        return this.customerService.getAllCustomers();
    }

    @Get('customers/:id')
    public getCustomer(@Param('id') id: string): Customer {
        return this.customerService.getCustomerById(id);
    }

    @Post('customers')
    public saveCustomer(@Body() customer: Customer): Customer {
        return this.customerService.saveCustomer(customer);
    }

    @Get('plans')
    public getPlans() {
        return this.customerService.getPlans();
    }

    @Get('business-hours')
    public getBusinessHours() {
        return this.customerService.getBusinessHours();
    }
}
