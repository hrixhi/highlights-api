import { Field, InputType } from 'type-graphql';

@InputType()
export class RangeInput {
    @Field((type) => String)
    public name: string;

    @Field((type) => Number)
    public start: number;

    @Field((type) => Number)
    public end: number;
}

@InputType()
export class GradingScaleInput {
    @Field((type) => String)
    public name: string;

    @Field((type) => [RangeInput])
    public range: [RangeInput];

    @Field((type) => Number, { nullable: true })
    public passFailMinimum: number;

    @Field((type) => Boolean)
    public default: boolean;

    @Field((type) => String)
    public schoolId: string;
}
