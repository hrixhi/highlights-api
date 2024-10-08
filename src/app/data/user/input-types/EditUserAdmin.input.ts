import { Field, InputType } from 'type-graphql';

@InputType()
export class EditUserAdmin {
    @Field()
    public _id: string;

    @Field()
    public email: string;

    @Field()
    public fullName: string;

    @Field()
    public grade: string;

    @Field()
    public section: string;

    @Field((type) => String, { nullable: true })
    public avatar: string;

    @Field((type) => String, { nullable: true })
    public schoolId: string;

    // If null then generate a new SIS ID
    @Field((type) => String, { nullable: true })
    public sisId?: string;

    // PERSONAL INFORMATION
    @Field((type) => String, { nullable: true })
    public dateOfBirth?: string;

    @Field((type) => Number, { nullable: true })
    public expectedGradYear?: number;

    @Field((type) => String, { nullable: true })
    public phoneNumber?: string;

    @Field((type) => String, { nullable: true })
    public streetAddress?: string;

    @Field((type) => String, { nullable: true })
    public streetAddress2?: string;

    @Field((type) => String, { nullable: true })
    public city?: string;

    @Field((type) => String, { nullable: true })
    public state?: string;

    @Field((type) => String, { nullable: true })
    public country?: string;

    @Field((type) => String, { nullable: true })
    public zip?: string;

    @Field((type) => Boolean, { nullable: true })
    public parent1Modified?: boolean;

    @Field((type) => String, { nullable: true })
    public parent1Name?: string;

    @Field((type) => String, { nullable: true })
    public parent1Email?: string;

    @Field((type) => Boolean, { nullable: true })
    public parent2Modified?: boolean;

    @Field((type) => String, { nullable: true })
    public parent2Name?: string;

    @Field((type) => String, { nullable: true })
    public parent2Email?: string;
}
