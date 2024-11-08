import bcryptjs from "bcryptjs";
import crypto from "crypto";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";
import {
	sendPasswordResetEmail,
	sendPasswordSetSuccessEmail,
	sendResetSuccessEmail,
	sendVerificationEmail,
	sendWelcomeEmail,
} from "../mailtrap/emails.js";
import { prisma } from "../lib/db.js";

export const signup = async (req, res) => {
	const { email, name } = req.body;

	try {
		if (!email || !name) {
			throw new Error("All fields are required");
		}

		const userAlreadyExists = await prisma.User.findUnique({
			where: { email },
		});

		if (userAlreadyExists) {
			return res
				.status(400)
				.json({ success: false, message: "User already exists" });
		}

		const verificationToken = Math.floor(
			100000 + Math.random() * 900000
		).toString();

		const user = await prisma.User.create({
			data: {
				email,
				name,
				verificationToken,
				verificationTokenExpiresAt: new Date(
					Date.now() + 24 * 60 * 60 * 1000
				),
			},
			select: {
				// to exclude some fields like password
				id: true,
				email: true,
				name: true,
				isVerified: true,
				lastLogin: true,
				verificationToken: true,
				verificationTokenExpiresAt: true,
			},
		});

		// jwt
		generateTokenAndSetCookie(res, user.id);

		await sendVerificationEmail(user.email, verificationToken);

		res.status(201).json({
			success: true,
			message: "User created successfully",
			user,
		});
	} catch (error) {
		return res.status(400).json({ success: false, message: error.message });
	}
};

export const verifyEmail = async (req, res) => {
	const { code, email } = req.body;

	try {
		const user = await prisma.User.findUnique({
			where: {
				email,
				verificationToken: code,
				verificationTokenExpiresAt: { gt: new Date() },
			},
		});

		if (!user) {
			return res.status(400).json({
				success: false,
				message: "Invalid or expired verification code",
			});
		}

		// generate password set token
		const setPasswordToken = crypto.randomBytes(20).toString("hex");
		const setPasswordExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

		const updatedUser = await prisma.User.update({
			where: {
				id: user.id,
			},
			data: {
				setPasswordToken: setPasswordToken,
				setPasswordExpiresAt: setPasswordExpiresAt,
				isVerified: true,
				verificationToken: null,
				verificationTokenExpiresAt: null,
			},
			select: {
				// to exclude some fields like password
				id: true,
				email: true,
				name: true,
				isVerified: true,
				lastLogin: true,
				verificationToken: true,
				verificationTokenExpiresAt: true,
				setPasswordToken: true,
				setPasswordExpiresAt: true,
			},
		});

		await sendWelcomeEmail(
			updatedUser.email,
			updatedUser.name,
			`${process.env.CLIENT_URL}/set-password/${setPasswordToken}`
		);

		res.status(200).json({
			success: true,
			message: "Email verified successfully",
			user: updatedUser,
			requirePasswordSetup: true, // Add this flag to inform the frontend
		});
	} catch (error) {
		console.error("error in verifyEmail ", error);
		return res
			.status(500)
			.json({ success: false, message: "Server Error" });
	}
};

export const login = async (req, res) => {
	const { email, password } = req.body;

	try {
		const user = await prisma.User.findUnique({ where: { email } });

		if (!user) {
			return res
				.status(400)
				.json({ success: false, message: "Invalid credentials" });
		}

		const isPasswordValid = await bcryptjs.compare(password, user.password);
		if (!isPasswordValid) {
			return res
				.status(400)
				.json({ success: false, message: "Invalid credentials" });
		}

		generateTokenAndSetCookie(res, user.id);

		const updatedUser = await prisma.User.update({
			where: {
				id: user.id,
			},
			data: {
				lastLogin: new Date(),
			},
			select: {
				// to exclude some fields like password
				id: true,
				email: true,
				name: true,
				isVerified: true,
				lastLogin: true,
			},
		});

		res.status(200).json({
			success: true,
			message: "Logged in successfully",
			user: updatedUser,
		});
	} catch (error) {
		console.error("error in login ", error);
		return res.status(400).json({ success: false, message: error.message });
	}
};

export const logout = async (req, res) => {
	res.clearCookie("token");
	res.status(200).json({ success: true, message: "Logged out successfully" });
};

export const forgotPassword = async (req, res) => {
	const { email } = req.body;

	try {
		const user = await prisma.User.findUnique({ where: { email } });

		if (!user) {
			return res
				.status(400)
				.json({ success: false, message: "User not found" });
		}

		// generate reset token
		const resetToken = crypto.randomBytes(20).toString("hex");
		const resetTokenExpiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

		const updatedUser = await prisma.User.update({
			where: {
				id: user.id,
			},
			data: {
				resetPasswordToken: resetToken,
				resetPasswordExpiresAt: resetTokenExpiresAt,
			},
			select: {
				// to exclude some fields like password
				id: true,
				email: true,
				name: true,
				isVerified: true,
				lastLogin: true,
				resetPasswordToken: true,
				resetPasswordExpiresAt: true,
			},
		});

		// send email
		await sendPasswordResetEmail(
			updatedUser.email,
			`${process.env.CLIENT_URL}/reset-password/${resetToken}`
		);

		res.status(200).json({
			success: true,
			message: "Password reset link sent to your email",
			user: updatedUser,
		});
	} catch (error) {
		console.error("Error in forgot password", error);
		res.status(400).json({ success: false, message: error.message });
	}
};

export const resetPassword = async (req, res) => {
	try {
		const { token } = req.params;
		const { email, password } = req.body;

		if (!password) {
			throw new Error("Password is required");
		}

		const user = await prisma.User.findUnique({
			where: {
				email,
				resetPasswordToken: token,
				resetPasswordExpiresAt: { gt: new Date() },
			},
		});

		if (!user) {
			return res.status(400).json({
				success: false,
				message: "Invalid or expired reset token",
			});
		}

		// update password
		const hashedPassword = await bcryptjs.hash(password, 10);

		const updatedUser = await prisma.User.update({
			where: {
				id: user.id,
			},
			data: {
				password: hashedPassword,
				resetPasswordToken: null,
				resetPasswordExpiresAt: null,
			},
			select: {
				// to exclude some fields like password
				id: true,
				email: true,
				name: true,
				isVerified: true,
				lastLogin: true,
				resetPasswordToken: true,
				resetPasswordExpiresAt: true,
			},
		});

		await sendResetSuccessEmail(updatedUser.email);

		res.status(200).json({
			success: true,
			message: "Password reset successful",
		});
	} catch (error) {
		console.error("Error in resetPassword: ", error);
		res.status(400).json({ success: false, message: error.message });
	}
};

export const setPassword = async (req, res) => {
	try {
		const { token } = req.params;
		const { email, password } = req.body;

		if (!password) {
			throw new Error("Password is required");
		}

		const user = await prisma.User.findUnique({
			where: {
				email,
				setPasswordToken: token,
				setPasswordExpiresAt: { gt: new Date() },
			},
		});

		if (!user) {
			return res.status(400).json({
				success: false,
				message: "Invalid or expired password set token",
			});
		}

		// update password
		const hashedPassword = await bcryptjs.hash(password, 10);

		const updatedUser = await prisma.User.update({
			where: {
				id: user.id,
			},
			data: {
				password: hashedPassword,
				setPasswordToken: null,
				setPasswordExpiresAt: null,
			},
			select: {
				// to exclude some fields like password
				id: true,
				email: true,
				name: true,
				isVerified: true,
				lastLogin: true,
				setPasswordToken: true,
				setPasswordExpiresAt: true,
			},
		});

		await sendPasswordSetSuccessEmail(updatedUser.email);

		res.status(200).json({
			success: true,
			message: "Password set successful",
		});
	} catch (error) {
		console.error("Error in setPassword: ", error);
		res.status(400).json({ success: false, message: error.message });
	}
};

export const checkAuth = async (req, res) => {
	try {
		const user = await prisma.User.findUnique({
			where: { id: req.userId },
			select: {
				// to exclude some fields like password
				id: true,
				email: true,
				name: true,
				isVerified: true,
				lastLogin: true,
			},
		});

		if (!user) {
			return res
				.status(400)
				.json({ status: false, message: "User not found" });
		}

		res.status(200).json({
			success: true,
			user,
		});
	} catch (error) {}
};
