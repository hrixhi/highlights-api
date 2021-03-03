import { CueModel } from '@app/data/cue/mongo/Cue.model';
import { UserModel } from '@app/data/user/mongo/User.model';
import { UserObject } from '@app/data/user/types/User.type';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class ModificationObject {

    // Submission object ??

    @Field()
    public cueId: string;

    @Field(type => String)
    public async cue() {
        const localThis: any = this;
        const { cueId } = localThis._doc || localThis;
        const originalCue: any = await CueModel.findById(cueId)
        return originalCue.cue;
    }

    @Field(type => UserObject)
    public async user() {
        const localThis: any = this;
        const { userId } = localThis._doc || localThis;
        const user: any = await UserModel.findById(userId)
        return user;
    }

    @Field()
    public score: number;

    @Field(type => Number)
    public gradeWeight: Number;

}