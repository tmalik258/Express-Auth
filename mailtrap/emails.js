import { VERIFICATION_EMAIL_TEMPLATE } from "./emailTemplates.js";
import { mailtrapClient, sender } from "./mailtrap.config.js";

export const sendVerificationEmail = async (email, verificationToken) => {
	const recipients = [{ email }];

	try {
		const response = await mailtrapClient.send({
			from: sender,
			to: recipients,
			subject: "Verify your account",
			html: VERIFICATION_EMAIL_TEMPLATE.replace(
				"{verificationCode}",
				verificationToken
			),
			category: "Email Verification",
		});

		console.log("Email sent successfully", response);
	} catch (error) {
		console.error(`Error sending verification email`, error);

		throw new Error(`Error sending verification email: ${error}`);
	}
};

export const sendWelcomeEmail = async (email, name) => {
	const recipients = [{ email }];

	try {
		const response = await mailtrapClient.send({
			from: sender,
			to: recipients,
			template_uuid: "a1ef20eb-7bb0-4c2b-972a-9c99f6b8596e",
			template_variables: {
				company_info_name: "Express Auth Company",
				name: name,
			},
		});

		console.log("Welcome Email sent successfully", response)
	} catch (error) {
		console.error(`Error sending welcome email`, error);

		throw new Error(`Error sending welcome email: ${error}`);
	}
};