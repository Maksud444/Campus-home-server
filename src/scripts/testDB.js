import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';
import Property from '../models/Property.model.js';

dotenv.config();

const testDatabase = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/student-housing');
    console.log('✅ Connected to MongoDB');
    console.log('📊 Database:', mongoose.connection.name);

    // Count users
    const userCount = await User.countDocuments();
    console.log(`\n👥 Total Users: ${userCount}`);

    // Show all users with roles
    const users = await User.find().select('name email role createdAt').limit(20);
    console.log('\n📋 All Users:');
    users.forEach(user => {
      console.log(`  - ${user.email} | Role: ${user.role} | Name: ${user.name}`);
    });

    // Role breakdown
    const studentCount = await User.countDocuments({ role: 'student' });
    const agentCount = await User.countDocuments({ role: 'agent' });
    const ownerCount = await User.countDocuments({ role: 'owner' });
    const serviceProviderCount = await User.countDocuments({ role: 'service-provider' });

    console.log('\n📊 Role Breakdown:');
    console.log(`  Students: ${studentCount}`);
    console.log(`  Agents: ${agentCount}`);
    console.log(`  Owners: ${ownerCount}`);
    console.log(`  Service Providers: ${serviceProviderCount}`);

    // Count properties
    const propertyCount = await Property.countDocuments();
    console.log(`\n🏠 Total Properties: ${propertyCount}`);

    // Show recent properties
    const properties = await Property.find().sort({ createdAt: -1 }).limit(5)
      .populate('owner', 'name email role');
    console.log('\n📋 Recent Properties:');
    properties.forEach(prop => {
      console.log(`  - ${prop.title}`);
      console.log(`    Owner: ${prop.owner?.email} (${prop.owner?.role})`);
      console.log(`    Type: ${prop.ownerType}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testDatabase();