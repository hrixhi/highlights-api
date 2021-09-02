import { Arg, Field, ObjectType } from "type-graphql";
import { hashPassword, verifyPassword } from "../methods";
import { SchoolsModel } from "./mongo/School.model";
/**
 * School Mutation Endpoints
 */
@ObjectType()
export class SchoolMutationResolver {
    @Field(type => Boolean, {
        description: "Used to update school admin details."
    })
    public async update(
        @Arg("schoolId", type => String)
        schoolId: string,
        @Arg("recoveryEmail", type => String)
        recoveryEmail: string,
        @Arg("allowStudentChannelCreation", type => Boolean)
        allowStudentChannelCreation: boolean,
        @Arg("logo", type => String, { nullable: true })
        logo?: string,
        @Arg("streamId", type => String, { nullable: true })
        streamId?: string,
    ) {
        try {

            await SchoolsModel.updateOne({ _id: schoolId }, {
                recoveryEmail,
                allowStudentChannelCreation,
                logo: logo && logo !== '' ? logo : undefined,
                streamId: streamId === '' ? undefined : streamId
            })

            return true

        } catch (e) {
            console.log(e)
            return false
        }
    }

    @Field(type => Boolean, {
        description: "Used to update school admin password."
    })
    public async updateAdminPassword(
        @Arg("schoolId", type => String)
        schoolId: string,
        @Arg("currentPassword", type => String)
        currentPassword: string,
        @Arg("newPassword", type => String)
        newPassword: string,
    ) {
        try {

            const s = await SchoolsModel.findById(schoolId)
            if (s) {
                const school: any = s.toObject()
                const passwordCorrect = await verifyPassword(currentPassword, school.password)
                if (passwordCorrect) {
                    const hash = await hashPassword(newPassword)
                    await SchoolsModel.updateOne({ _id: schoolId }, { password: hash })
                    return true
                } else {
                    return false
                }
            } else {
                return false
            }

        } catch (e) {
            console.log(e)
            return false
        }
    }
}
