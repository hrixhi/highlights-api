const postmark = require('postmark');
const client = new postmark.Client('d381fb20-f2d7-4b6b-9c97-0da983ae885d');

export class EmailService {
    public addedToOrgConfirm(email: string, orgName: string) {
        client.sendEmail({
            From: 'support@learnwithcues.com',
            To: email,
            Subject: 'CUES - You have been added to the ' + orgName + ' organisation.',
            TextBody: 'Visit app.learnwithcues.com to log in. You will be notified if you are added to any courses.'
        });
    }

    public newAccountAddedToOrgConfirm(email: string, name: string, password: string, orgName: string) {
        client.sendEmail({
            From: 'support@learnwithcues.com',
            To: email,
            Subject: 'CUES - You have been added to the ' + orgName + ' organisation.',
            TextBody:
                'Welcome to Cues, ' +
                name +
                '! Visit app.learnwithcues.com to begin using Cues online or download our app on your laptop/mobile device. To login use email: ' +
                email +
                ' & password: ' +
                password +
                '. You will be notified when you are added to any courses. You can update your password from within the app.'
        });
    }

    public existingAccountAddedToOrgConfirm(email: string, name: string, orgName: string) {
        client.sendEmail({
            From: 'support@learnwithcues.com',
            To: email,
            Subject: 'CUES - You have been added to the ' + orgName + ' organisation.',
            TextBody:
                'Welcome to Cues, ' +
                name +
                '! You have been added to ' +
                orgName +
                ' organisation. ' +
                'You will be notified when you are added to any courses.'
        });
    }

    public inviteByEmail(email: string, channelName: string) {
        client.sendEmail({
            From: 'support@learnwithcues.com',
            To: email,
            Subject: 'CUES - You have been added to the ' + channelName + ' classroom.',
            TextBody: 'Visit app.learnwithcues.com to log in and view your course.'
        });
    }

    public newAccountInviteByEmail(email: string, password: string, channelName: string) {
        client.sendEmail({
            From: 'support@learnwithcues.com',
            To: email,
            Subject: 'CUES - You have been added to the ' + channelName + ' classroom.',
            TextBody:
                'Welcome to Cues! Visit app.learnwithcues.com to log in using email: ' +
                email +
                ' & password: ' +
                password +
                ' to view course. If you are a new user, you must update your personal details by accessing your profile.'
        });
    }

    public resetPassword(email: string, password: string) {
        client.sendEmail({
            From: 'support@learnwithcues.com',
            To: email,
            Subject: 'CUES - Your password has been reset.',
            TextBody:
                'Visit app.learnwithcues.com to log in using this temporary password which you should then update: ' +
                password
        });
    }

    public ssoRequest(schoolName: string, ssoDomain: string, cuesDomain: string) {
        client.sendEmail({
            From: 'support@learnwithcues.com',
            To: 'prabirvora@gmail.com',
            Subject: 'New Request to Activate SSO - ' + schoolName,
            TextBody:
                'Enable SSO for school ' +
                schoolName +
                ' and cues domain ' +
                cuesDomain +
                '. Requested domain to be used for SSO is ' +
                ssoDomain +
                '.'
        });
    }
}
