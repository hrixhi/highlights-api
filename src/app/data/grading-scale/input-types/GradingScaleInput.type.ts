import { Field, InputType } from 'type-graphql';

@InputType()
export class RangeInput {
    @Field((type) => String)
    public name: string;

    @Field((type) => Number, { nullable: true })
    public start?: number;

    @Field((type) => Number, { nullable: true })
    public end?: number;

    @Field((type) => Number, { nullable: true })
    public points?: number;

    @Field((type) => String, { nullable: true })
    public description?: string;
}

@InputType()
export class GradingScaleInput {
    @Field((type) => String)
    public name: string;

    @Field((type) => [RangeInput], { nullable: true })
    public range?: [RangeInput];

    @Field((type) => Number, { nullable: true })
    public passFailMinimum: number;

    @Field((type) => Boolean)
    public default: boolean;

    @Field((type) => String)
    public schoolId: string;

    @Field((type) => Boolean, { nullable: true })
    public standardsBasedScale?: boolean;

    @Field((type) => String, { nullable: true })
    public standardsGradeMode?: string;
}

@InputType()
export class EditGradingScaleInput {
    @Field((type) => String)
    public _id: string;

    @Field((type) => String)
    public name: string;

    @Field((type) => [RangeInput], { nullable: true })
    public range?: [RangeInput];

    @Field((type) => Number, { nullable: true })
    public passFailMinimum: number;

    @Field((type) => Boolean)
    public default: boolean;

    @Field((type) => String)
    public schoolId: string;

    @Field((type) => Boolean, { nullable: true })
    public standardsBasedScale?: boolean;

    @Field((type) => String, { nullable: true })
    public standardsGradeMode?: string;
}
