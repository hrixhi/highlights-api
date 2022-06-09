import { AcademicTermModel } from '@app/data/academic-term/mongo/academicTerm.model';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
class CoursePricingObject {
    @Field((type) => String)
    public courseId: string;

    @Field((type) => Number)
    public price: number;
}

@ObjectType()
class InvoiceItemObject {
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

    @Field((type) => [CoursePricingObject], { nullable: true })
    public pricePerCourse?: CoursePricingObject[];

    @Field((type) => Number, { nullable: true })
    public defaultCourseTuition?: number;
}

@ObjectType()
export class FeePlanObject {
    @Field((type) => String)
    public _id: string;

    @Field((type) => String)
    public name: string;

    @Field((type) => String)
    public type: string;

    @Field((type) => Number, { nullable: true })
    public feeAmount?: number;

    @Field((type) => [InvoiceItemObject], { nullable: true })
    public invoiceItems?: InvoiceItemObject[];

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

    @Field((type) => String, { nullable: true })
    public async termName() {
        const localThis: any = this;
        const { term } = localThis._doc || localThis;

        if (!term) return null;

        const academicTerm = await AcademicTermModel.findOne({
            _id: term,
        });

        return academicTerm ? academicTerm.name : null;
    }
}
