import { PrismaClient } from "@prisma/client";

let prisma; // Singleton Prisma Client instance

if (process.env.NODE_ENV === "production") {
	prisma = new PrismaClient();
} else {
	// If in development or test environments, we want to use a global variable
	// to avoid creating multiple Prisma clients during hot reloading.
	if (!global.prisma) {
		global.prisma = new PrismaClient();
	}
	prisma = global.prisma;
}

export { prisma };
