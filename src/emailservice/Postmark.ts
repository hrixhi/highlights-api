const postmark = require("postmark");
const client = new postmark.Client("3fac3fba-a29e-4719-8420-3e18186152c5");

export class EmailService {
    public addedToOrgConfirm(email: string, orgName: string) {
        client.sendEmail({
            "From": "alert@cuesapp.co",
            "To": email,
            "Subject": "CUES - You have been added to organisation " + orgName,
            "TextBody": "Visit www.cuesapp.co to log in. You will be notified when you are added to any courses."
        });
    }

    public newAccountAddedToOrgConfirm(email: string, password: string, orgName: string) {
        client.sendEmail({
            "From": "alert@cuesapp.co",
            "To": email,
            "Subject": "CUES - You have been added to organisation " + orgName,
            "TextBody": "Visit www.cuesapp.co to login using email: " + email + " & password: " + password + " (You will be notified when you are added to any courses)."
        });
    }

    public inviteByEmail(email: string, channelName: string) {
        client.sendEmail({
            "From": "alert@cuesapp.co",
            "To": email,
            "Subject": "CUES - You have been added to course " + channelName,
            "TextBody": "Visit www.cuesapp.co to log in and view course."
        });
    }

    public newAccountInviteByEmail(email: string, password: string, channelName: string) {
        client.sendEmail({
            "From": "alert@cuesapp.co",
            "To": email,
            "Subject": "CUES - You have been added to course " + channelName,
            "TextBody": "Visit www.cuesapp.co to log in using email: " + email + " & password: " + password + " to view course."
        });
    }

    public resetPassword(email: string, password: string) {
        client.sendEmail({
            "From": "alert@cuesapp.co",
            "To": email,
            "Subject": "CUES - Your password has been reset",
            "TextBody": "Visit www.cuesapp.co to log in using this temporary password: " + password
        })
    }

}