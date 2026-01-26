import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Property from '../models/Property.model.js';

dotenv.config();

const properties = [
  {
    title: 'La Reva Apartment',
    description: 'Modern apartment in New Capital City with stunning views and premium amenities',
    type: 'apartment',
    price: 1422200,
    location: 'Cairo',
    area: 'New Capital City, R8',
    bedrooms: 3,
    bathrooms: 2,
    size: 150,
    furnished: true,
    images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600'],
    amenities: ['WiFi', 'Parking', 'Security', '24/7 Concierge'],
    verified: true,
    available: true,
    owner: '6970b9be0d8e9230ae62a25c', // maksud (agent)
  },
  {
    title: 'Riverstone Villa',
    description: 'Luxurious villa in South Investors Area with private pool and garden',
    type: 'villa',
    price: 3305782,
    location: 'Cairo',
    area: 'New Cairo City, South Investors Area',
    bedrooms: 4,
    bathrooms: 3,
    size: 350,
    furnished: true,
    images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600'],
    amenities: ['Pool', 'Garden', 'Gym', 'Security', 'Parking'],
    verified: true,
    available: true,
    owner: '69752e9c00543ea33e8dec96', // test two (owner)
  },
  {
    title: 'Winter Park',
    description: 'Cozy apartment in R8 district, perfect for students',
    type: 'apartment',
    price: 1512500,
    location: 'Cairo',
    area: 'New Capital City, R8',
    bedrooms: 2,
    bathrooms: 2,
    size: 120,
    furnished: true,
    images: ['https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600'],
    amenities: ['WiFi', 'Parking', 'Balcony'],
    verified: true,
    available: true,
    owner: '6970b9be0d8e9230ae62a25c',
  },
  {
    title: '40 Square Premium',
    description: 'Premium apartment complex with world-class facilities',
    type: 'apartment',
    price: 4630000,
    location: 'Cairo',
    area: 'New Capital City',
    bedrooms: 3,
    bathrooms: 2,
    size: 200,
    furnished: true,
    images: ['https://images.unsplash.com/photo-1565402170291-8491f14678db?w=600'],
    amenities: ['Gym', 'Pool', 'Parking', 'Security', 'Spa'],
    verified: true,
    available: true,
    owner: '69751d2200543ea33e8dec8b', // Test Agent
  },
  {
    title: 'Isola Quattro 2',
    description: 'Modern living in The 5th Settlement',
    type: 'apartment',
    price: 2040500,
    location: 'Cairo',
    area: 'New Cairo City, The 5th Settlement',
    bedrooms: 2,
    bathrooms: 2,
    size: 140,
    furnished: true,
    images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600'],
    amenities: ['WiFi', 'Parking', 'Garden', 'Playground'],
    verified: true,
    available: true,
    owner: '6970b9be0d8e9230ae62a25c',
  },
  {
    title: 'East Vale',
    description: 'Future City development with smart home features',
    type: 'apartment',
    price: 8500000,
    location: 'Cairo',
    area: 'Mostakbal City, New Future City',
    bedrooms: 4,
    bathrooms: 3,
    size: 250,
    furnished: true,
    images: ['https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600'],
    amenities: ['Pool', 'Gym', 'Security', 'Parking', 'Smart Home'],
    verified: true,
    available: true,
    owner: '69752e9c00543ea33e8dec96',
  },
  {
    title: 'Nasr City Studio',
    description: 'Affordable studio apartment near universities',
    type: 'studio',
    price: 850000,
    location: 'Cairo',
    area: 'Nasr City',
    bedrooms: 1,
    bathrooms: 1,
    size: 60,
    furnished: true,
    images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600'],
    amenities: ['WiFi', 'AC', 'Kitchen'],
    verified: true,
    available: true,
    owner: '696eae574f0bad72b1ec43fb', // Ahmed Hassan (student)
  },
  {
    title: 'Maadi Shared Room',
    description: 'Shared room for students, walking distance to AUC',
    type: 'room',
    price: 250000,
    location: 'Cairo',
    area: 'Maadi',
    bedrooms: 1,
    bathrooms: 1,
    size: 30,
    furnished: true,
    images: ['https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600'],
    amenities: ['WiFi', 'Shared Kitchen', 'Laundry'],
    verified: true,
    available: true,
    owner: '69751d2200543ea33e8dec8b',
  },
  {
    title: 'Zamalek Penthouse',
    description: 'Luxury penthouse with Nile view',
    type: 'apartment',
    price: 12000000,
    location: 'Cairo',
    area: 'Zamalek',
    bedrooms: 5,
    bathrooms: 4,
    size: 400,
    furnished: true,
    images: ['https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=600'],
    amenities: ['Pool', 'Gym', 'Parking', 'Security', 'Concierge', 'Nile View'],
    verified: true,
    available: true,
    owner: '69752e9c00543ea33e8dec96',
  },
  {
    title: 'Heliopolis Family Home',
    description: 'Spacious family apartment in Heliopolis',
    type: 'apartment',
    price: 3200000,
    location: 'Cairo',
    area: 'Heliopolis',
    bedrooms: 3,
    bathrooms: 2,
    size: 180,
    furnished: false,
    images: ['https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=600'],
    amenities: ['Parking', 'Balcony', 'Storage'],
    verified: true,
    available: true,
    owner: '6970b9be0d8e9230ae62a25c',
  },
];

const seedProperties = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log('📡 Using:', process.env.MONGODB_URI.substring(0, 30) + '...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB!\n');

    console.log('🗑️  Clearing existing properties...');
    const deleteResult = await Property.deleteMany({});
    console.log(`   Deleted ${deleteResult.deletedCount} existing properties\n`);

    console.log('📝 Creating new properties...');
    const createdProperties = await Property.insertMany(properties);

    console.log(`✅ Created ${createdProperties.length} properties!\n`);
    
    console.log('Properties added:');
    console.log('='.repeat(60));
    createdProperties.forEach((p, index) => {
      console.log(`${index + 1}. ${p.title}`);
      console.log(`   📍 ${p.area}, ${p.location}`);
      console.log(`   💰 ${p.price.toLocaleString()} EGP`);
      console.log(`   🛏️  ${p.bedrooms} beds | 🚿 ${p.bathrooms} baths | 📐 ${p.size} sqm`);
      console.log(`   🆔 ${p._id}`);
      console.log('');
    });
    console.log('='.repeat(60));
    console.log('✅ Seed complete!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

seedProperties();