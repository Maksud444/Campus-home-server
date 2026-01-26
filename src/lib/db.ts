import fs from 'fs'
import path from 'path'

const usersFilePath = path.join(process.cwd(), 'data', 'users.json')

export interface User {
  id: string
  name: string
  email: string
  password: string
  role: 'student' | 'agent' | 'owner'
  image?: string
  provider: string
  phone?: string
  bio?: string
  university?: string
  location?: string
  createdAt: string
  updatedAt: string
}

const ensureDataDir = () => {
  try {
    const dataDir = path.join(process.cwd(), 'data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    if (!fs.existsSync(usersFilePath)) {
      fs.writeFileSync(usersFilePath, JSON.stringify([]))
    }
  } catch (error) {
    console.error('Error ensuring data directory:', error)
  }
}

export const getUsers = (): User[] => {
  try {
    ensureDataDir()
    const data = fs.readFileSync(usersFilePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Error reading users:', error)
    return []
  }
}

export const getUserByEmail = (email: string): User | undefined => {
  const users = getUsers()
  const normalizedEmail = email.trim().toLowerCase()
  return users.find(u => u.email.toLowerCase() === normalizedEmail)
}

export const getUserById = (id: string): User | undefined => {
  const users = getUsers()
  return users.find(u => u.id === id)
}

export const createUser = (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User => {
  try {
    ensureDataDir()
    const users = getUsers()
    
    const newUser: User = {
      ...user,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    users.push(newUser)
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2))
    
    return newUser
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}

export const updateUser = (id: string, updates: Partial<User>): User | null => {
  try {
    ensureDataDir()
    const users = getUsers()
    const userIndex = users.findIndex(u => u.id === id)
    
    if (userIndex === -1) {
      return null
    }
    
    users[userIndex] = {
      ...users[userIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2))
    
    return users[userIndex]
  } catch (error) {
    console.error('Error updating user:', error)
    throw error
  }
}