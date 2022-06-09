const postmark = require('postmark');
const client = new postmark.Client('d381fb20-f2d7-4b6b-9c97-0da983ae885d');

export class EmailService {
    public contactSales(
        name: string,
        email: string,
        orgName: string,
        numOfInstructors: string,
        numOfStudents: string,
        country: string,
        learningModel: string
    ) {
        client
            .sendEmail({
                From: 'support@learnwithcues.com',
                To: 'hrishi@learnwithcues.com',
                Subject: 'CUES - New sales inquiry',
                TextBody:
                    'New sales inquiry from ' +
                    name +
                    ' , with email ' +
                    email +
                    '. ' +
                    (orgName !== '' ? 'Org name is ' + orgName + '.' : '') +
                    (numOfInstructors !== '' ? 'Number of instructors is ' + numOfInstructors + '.' : '') +
                    (numOfStudents !== '' ? 'Number of students is ' + numOfStudents + '.' : '') +
                    (country !== '' ? 'Country is ' + country + '.' : '') +
                    (learningModel !== '' ? 'Learning model is ' + learningModel + '.' : ''),
            })
            .then((res: any) => {
                return;
            })
            .catch((e: any) => {
                console.log('error handling', e);
            });
    }

    public addedToOrgConfirm(email: string, orgName: string) {
        client
            .sendEmail({
                From: 'support@learnwithcues.com',
                To: email,
                Subject: 'CUES - You have been added to the ' + orgName + ' organisation.',
                TextBody:
                    'Visit app.learnwithcues.com to log in. You will be notified if you are added to any courses.',
            })
            .then((res: any) => {
                return;
            })
            .catch((e: any) => {
                console.log('error handling', e);
            });
    }

    public newAccountAddedToOrgConfirm(email: string, name: string, password: string, orgName: string) {
        client
            .sendEmail({
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
                    '. You will be notified when you are added to any courses. You can update your password from within the app.',
            })
            .then((res: any) => {
                return;
            })
            .catch((e: any) => {
                console.log('error handling', e);
            });
    }

    public existingAccountAddedToOrgConfirm(email: string, name: string, orgName: string) {
        client
            .sendEmail({
                From: 'support@learnwithcues.com',
                To: email,
                Subject: 'CUES - You have been added to the ' + orgName + ' organisation.',
                TextBody:
                    'Welcome to Cues, ' +
                    name +
                    '! You have been added to ' +
                    orgName +
                    ' organisation. ' +
                    'You will be notified when you are added to any courses.',
            })
            .then((res: any) => {
                return;
            })
            .catch((e: any) => {
                console.log('error handling', e);
            });
    }

    public inviteByEmail(email: string, channelName: string) {
        client
            .sendEmail({
                From: 'support@learnwithcues.com',
                To: email,
                Subject: 'CUES - You have been added to the ' + channelName + ' classroom.',
                TextBody: 'Visit app.learnwithcues.com to log in and view your course.',
            })
            .then((res: any) => {
                return;
            })
            .catch((e: any) => {
                console.log('error handling', e);
            });
    }

    public newAccountInviteByEmail(email: string, password: string, channelName: string) {
        client
            .sendEmail({
                From: 'support@learnwithcues.com',
                To: email,
                Subject: 'CUES - You have been added to the ' + channelName + ' classroom.',
                TextBody:
                    'Welcome to Cues! Visit app.learnwithcues.com to log in using email: ' +
                    email +
                    ' & password: ' +
                    password +
                    ' to view course. If you are a new user, you must update your personal details by accessing your profile.',
            })
            .then((res: any) => {
                return;
            })
            .catch((e: any) => {
                console.log('error handling', e);
            });
    }

    public resetPassword(email: string, password: string) {
        client
            .sendEmail({
                From: 'support@learnwithcues.com',
                To: email,
                Subject: 'CUES - Your password has been reset.',
                TextBody:
                    'Visit app.learnwithcues.com to log in using this temporary password which you should then update: ' +
                    password,
            })
            .then((res: any) => {
                return;
            })
            .catch((e: any) => {
                console.log('error handling', e);
            });
    }

    public ssoRequest(schoolName: string, ssoDomain: string, cuesDomain: string) {
        client
            .sendEmail({
                From: 'support@learnwithcues.com',
                To: 'support@learnwithcues.com',
                Subject: 'New Request to Activate SSO - ' + schoolName,
                TextBody:
                    'Enable SSO for school ' +
                    schoolName +
                    ' and cues domain ' +
                    cuesDomain +
                    '. Requested domain to be used for SSO is ' +
                    ssoDomain +
                    '.',
            })
            .then((res: any) => {
                return;
            })
            .catch((e: any) => {
                console.log('error handling', e);
            });
    }

    public newOnboardAlert(
        instructorName: string,
        instructorEmail: string,
        courseName: string,
        studentCount: number,
        organisationName: string,
        country: string
    ) {
        client
            .sendEmail({
                From: 'support@learnwithcues.com',
                To: 'hrishi@learnwithcues.com',
                Cc: 'prabir@learnwithcues.com',
                Subject: 'New course signup by ' + instructorName,
                TextBody:
                    'New course signup ' +
                    '(' +
                    courseName +
                    ')' +
                    ' by ' +
                    instructorName +
                    ', ' +
                    instructorEmail +
                    '. ' +
                    studentCount +
                    ' students added to the course. ' +
                    (organisationName !== '' ? 'Instructor is from organization ' + organisationName + '. ' : '') +
                    (country !== '' ? 'Instructor is from country ' + country + '.' : ''),
            })
            .then((res: any) => {
                return;
            })
            .catch((e: any) => {
                console.log('error handling', e);
            });
    }

    public sendWelcomeEmailInstructor(name: string, email_id: string, course_name: string) {
        client
            .sendEmailWithTemplate({
                From: 'support@learnwithcues.com',
                To: email_id,
                TemplateAlias: 'welcome_instructor',
                TemplateModel: {
                    name,
                    email_id,
                    course_name,
                },
            })
            .then((res: any) => {
                return;
            })
            .catch((e: any) => {
                console.log('error handling', e);
            });
    }

    public sendWelcomeEmailStudent(
        name: string,
        email_id: string,
        course_name: string,
        password: string,
        instructor_name: string
    ) {
        client
            .sendEmailWithTemplate({
                From: 'support@learnwithcues.com',
                To: email_id,
                TemplateAlias: 'welcome_student',
                TemplateModel: {
                    name,
                    email_id,
                    course_name,
                    password,
                    instructor_name,
                },
            })
            .then((res: any) => {
                return;
            })
            .catch((e: any) => {
                console.log('error handling', e);
            });
    }

    public newUserAddedPassword(name: string, email_id: string, password: string, school_name: string) {
        client
            .sendEmailWithTemplate({
                From: 'support@learnwithcues.com',
                To: email_id,
                TemplateAlias: 'new_user_added_password',
                TemplateModel: {
                    name,
                    email_id,
                    school_name,
                    password,
                },
            })
            .then((res: any) => {
                return;
            })
            .catch((e: any) => {
                console.log('error handling', e);
            });
    }

    public newUserAddedSSO(name: string, email_id: string, school_name: string) {
        client
            .sendEmailWithTemplate({
                From: 'support@learnwithcues.com',
                To: email_id,
                TemplateAlias: 'new_user_added_SSO',
                TemplateModel: {
                    name,
                    email_id,
                    school_name,
                },
            })
            .then((res: any) => {
                return;
            })
            .catch((e: any) => {
                console.log('error handling', e);
            });
    }
}
