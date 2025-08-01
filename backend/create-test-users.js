const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config({ path: './config.env' });

async function createTestUsers() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Create test users
        const testUsers = [
            {
                username: 'student1',
                email: 'student1@test.com',
                password: 'password123',
                role: 'student',
                profile: {
                    firstName: 'John',
                    lastName: 'Student',
                    bio: 'Engineering student'
                },
                isActive: true,
                isVerified: true
            },
            {
                username: 'counsellor1',
                email: 'counsellor1@test.com',
                password: 'password123',
                role: 'counsellor',
                profile: {
                    firstName: 'Dr. Sarah',
                    lastName: 'Counsellor',
                    bio: 'Licensed mental health counsellor',
                    specialization: 'Anxiety and Stress Management'
                },
                isActive: true,
                isVerified: true
            },
            {
                username: 'counsellor2',
                email: 'counsellor2@test.com',
                password: 'password123',
                role: 'counsellor',
                profile: {
                    firstName: 'Dr. Michael',
                    lastName: 'Therapist',
                    bio: 'Clinical psychologist',
                    specialization: 'Depression and Academic Stress'
                },
                isActive: true,
                isVerified: true
            },
            {
                username: 'admin1',
                email: 'admin1@test.com',
                password: 'password123',
                role: 'admin',
                profile: {
                    firstName: 'Admin',
                    lastName: 'User',
                    bio: 'Platform administrator'
                },
                isActive: true,
                isVerified: true
            }
        ];

        for (const userData of testUsers) {
            // Check if user already exists
            const existingUser = await User.findOne({ email: userData.email });
            if (existingUser) {
                console.log(`User ${userData.email} already exists, skipping...`);
                continue;
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(userData.password, 12);

            // Create user
            const user = new User({
                ...userData,
                password: hashedPassword
            });

            await user.save();
            console.log(`Created user: ${userData.email} (${userData.role})`);
        }

        console.log('Test users created successfully!');
        console.log('\nTest Accounts:');
        console.log('Student: student1@test.com / password123');
        console.log('Counsellor 1: counsellor1@test.com / password123');
        console.log('Counsellor 2: counsellor2@test.com / password123');
        console.log('Admin: admin1@test.com / password123');

    } catch (error) {
        console.error('Error creating test users:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

createTestUsers(); 