import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Property from '../models/Property.model.js';
import User from '../models/User.model.js';

dotenv.config();

const viewData = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!\n');

    // ========== USERS ==========
    console.log('=' .repeat(60));
    console.log('👥 USERS');
    console.log('='.repeat(60));
    
    const users = await User.find().select('-password');
    console.log(`Total Users: ${users.length}\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   ID: ${user._id}`);
      console.log('');
    });

    // ========== PROPERTIES ==========
    console.log('='.repeat(60));
    console.log('🏠 PROPERTIES');
    console.log('='.repeat(60));
    
    const properties = await Property.find();
    console.log(`Total Properties: ${properties.length}\n`);
    
    if (properties.length === 0) {
      console.log('❌ No properties found in database!');
      console.log('💡 Run: node src/scripts/seedProperties.js to add sample data\n');
    } else {
      properties.forEach((property, index) => {
        console.log(`${index + 1}. ${property.title}`);
        console.log(`   Location: ${property.area}, ${property.location}`);
        console.log(`   Price: ${property.price.toLocaleString()} EGP`);
        console.log(`   Bedrooms: ${property.bedrooms} | Type: ${property.type}`);
        console.log(`   ID: ${property._id}`);
        console.log(`   Created: ${property.createdAt}`);
        console.log('');
      });
    }

    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

viewData();