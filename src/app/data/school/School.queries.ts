import { Arg, Field, ObjectType } from 'type-graphql';
import { UserModel } from '../user/mongo/User.model';
import { SchoolsModel } from './mongo/School.model';
import { SchoolObject } from './types/School.type';

/**
 * School Query Endpoints
 */
@ObjectType()
export class SchoolQueryResolver {

    @Field(type => SchoolObject, {
        description: "Used to retrieve school",
        nullable: true
    })
    public async findById(
        @Arg("schoolId", type => String)
        schoolId: string
    ) {
        try {
            return await SchoolsModel.findById(schoolId)
        } catch (e) {
            console.log(e)
            return null
        }
    }

    @Field(type => SchoolObject, {
        description: "Used to retrieve school by userId",
        nullable: true
    })
    public async findByUserId(
        @Arg("userId", type => String)
        userId: string
    ) {
        try {
            const u = await UserModel.findById(userId)
            if (u) {
                const user = u.toObject()
                if (user.schoolId) {
                    return await SchoolsModel.findById(user.schoolId)
                }
            }
            return null
        } catch (e) {
            console.log(e)
            return null
        }
    }

}