import { Ctx, Field, ObjectType } from 'type-graphql';
import { IGraphQLContext } from '@app/server/interfaces/Context.interface';
import { ChannelModel } from '@app/data/channel/mongo/Channel.model';

@ObjectType()
export class RangeObject {
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

@ObjectType()
export class GradingScaleObject {
    @Field((type) => String)
    public _id: string;

    @Field((type) => String)
    public name: string;

    @Field((type) => [RangeObject])
    public range: RangeObject[];

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

    @Field((type) => Number, { nullable: true })
    public async courses() {
        const localThis: any = this;
        const { _id, standardsBasedScale } = localThis._doc || localThis;

        let fetchCourses;

        if (standardsBasedScale) {
            fetchCourses = await ChannelModel.find({
                standardsBasedGradingScale: _id,
                deletedAt: undefined,
            });
        } else {
            fetchCourses = await ChannelModel.find({
                gradingScale: _id,
                deletedAt: undefined,
            });
        }

        if (fetchCourses) {
            return fetchCourses.length;
        }

        return 0;
    }

    // @Field((type) => Number, { nullable: true })
    // public async courses() {
    //     const localThis: any = this;
    //     const { _id } = localThis._doc || localThis;

    //     const fetchCourses = await ChannelModel.find({
    //         term: _id,
    //         deletedAt: undefined,
    //     });

    //     if (fetchCourses) {
    //         return fetchCourses.length;
    //     }

    //     return 0;
    // }
}
