import { Field, InputType } from 'type-graphql';

@InputType()
class CoursePricingInput {
    @Field((type) => String)
    public courseId: string;

    @Field((type) => Number)
    public price: number;
}

@InputType()
class InvoiceItemInput {
    @Field((type) => String)
    public description: string;

    @Field((type) => String)
    public pricingType: string;

    @Field((type) => Number, { nullable: true })
    public quantity?: number;

    @Field((type) => Number, { nullable: true })
    public price?: number;

    @Field((type) => String, { nullable: true })
    public variableType?: string;

    @Field((type) => Number, { nullable: true })
    public tuitionPerUnit?: number;

    @Field((type) => [CoursePricingInput], { nullable: true })
    public pricePerCourse?: CoursePricingInput[];

    @Field((type) => Number, { nullable: true })
    public defaultCourseTuition?: number;
}

@InputType()
export class FeePlanInput {
    @Field((type) => String)
    public name: string;

    @Field((type) => String)
    public type: string;

    @Field((type) => Number, { nullable: true })
    public feeAmount?: number;

    @Field((type) => [InvoiceItemInput], { nullable: true })
    public invoiceItems?: InvoiceItemInput[];

    @Field((type) => String)
    public billingType: string;

    @Field((type) => Date, { nullable: true })
    public paymentDue?: Date;

    @Field((type) => Number, { nullable: true })
    public dayOfMonth?: number;

    @Field((type) => Date, { nullable: true })
    public startMonth?: Date;

    @Field((type) => Date, { nullable: true })
    public endMonth?: Date;

    @Field((type) => String, { nullable: true })
    public term?: string;

    @Field((type) => String)
    public schoolId: string;
}
