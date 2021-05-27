const postmark = require("postmark");
const client = new postmark.Client("3fac3fba-a29e-4719-8420-3e18186152c5");

export class EmailService {
    public addedToOrgConfirm(email: string, orgName: string) {
        client.sendEmail({
            "From": "info@cuesapp.co",
            "To": email,
            "Subject": "CUES - You have been added to the " + orgName + " organisation.",
            "TextBody": "Visit web.cuesapp.co or our iOS/Android applications to log in. You will be notified if you are added to any courses."
        });
    }

    public newAccountAddedToOrgConfirm(email: string, password: string, orgName: string) {
        client.sendEmail({
            "From": "info@cuesapp.co",
            "To": email,
            "Subject": "CUES - You have been added to the " + orgName + " organisation.",
            "TextBody": "Welcome to Cues! Visit web.cuesapp.co or our iOS/Android applications to login using email: " + email + " & password: " + password + " (You will be notified when you are added to any courses). If you are a new user, you must update your personal details by accessing your profile."
        });
    }

    public inviteByEmail(email: string, channelName: string) {
        client.sendEmail({
            "From": "info@cuesapp.co",
            "To": email,
            "Subject": "CUES - You have been added to the " + channelName + " classroom.",
            "TextBody": "Visit web.cuesapp.co or our iOS/Android applications to log in and view your course."
        });
    }

    public newAccountInviteByEmail(email: string, password: string, channelName: string) {
        client.sendEmail({
            "From": "info@cuesapp.co",
            "To": email,
            "Subject": "CUES - You have been added to the " + channelName + " classroom.",
            "TextBody": "Welcome to Cues! Visit web.cuesapp.co or our iOS/Android applications to log in using email: " + email + " & password: " + password + " to view course. If you are a new user, you must update your personal details by accessing your profile."
        });
    }

    public resetPassword(email: string, password: string) {
        client.sendEmail({
            "From": "info@cuesapp.co",
            "To": email,
            "Subject": "CUES - Your password has been reset.",
            "TextBody": "Visit web.cuesapp.co or our iOS/Android applications to log in using this temporary password which you should then update: " + password
        })
    }

}