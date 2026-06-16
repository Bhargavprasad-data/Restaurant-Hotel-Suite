const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool } = require('./db');

async function seed() {
  console.log('Starting database seeding...');
  
  try {
    // 1. Read and execute Schema
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schemaSql);
    console.log('Database tables cleared and created successfully.');

    // 2. Hash default passwords
    const adminHash = await bcrypt.hash('Bhargav11@prasad', 10);
    const waiterHash = await bcrypt.hash('waiter123', 10);
    const kitchenHash = await bcrypt.hash('kitchen123', 10);

    // 3. Insert default users
    const usersQuery = `
      INSERT INTO users (name, email, password_hash, role, phone_number, shift_timing)
      VALUES 
        ('Bhargav Vana', 'bhargavvana80@gmail.com', $1, 'admin', '9876543210', '09:00 - 18:00'),
        ('Rahul Sharma', 'waiter1@restaurant.com', $2, 'waiter', '9876543211', '09:00 - 17:00'),
        ('Sneha Reddy', 'waiter2@restaurant.com', $2, 'waiter', '9876543212', '16:00 - 00:00'),
        ('Chef Rajesh', 'kitchen1@restaurant.com', $3, 'kitchen', '9876543213', '10:00 - 22:00')
    `;
    await pool.query(usersQuery, [adminHash, waiterHash, kitchenHash]);
    console.log('Default users seeded successfully.');

    // 4. Insert default Tables (Tables 1 - 10)
    const tablesQuery = `
      INSERT INTO tables (table_number, capacity, status)
      VALUES 
        (1, 2, 'available'),
        (2, 2, 'available'),
        (3, 4, 'available'),
        (4, 4, 'available'),
        (5, 4, 'available'),
        (6, 6, 'available'),
        (7, 6, 'available'),
        (8, 8, 'available'),
        (9, 8, 'available'),
        (10, 10, 'available')
    `;
    await pool.query(tablesQuery);
    console.log('Default restaurant tables (1 to 10) seeded.');

    // 5. Insert starter menu items
    const menuQuery = `
      INSERT INTO menu_items (name, description, price, category, time_restriction, is_available, image_url)
      VALUES 
        -- Starters (Available all day)
        ('Tomato Basil Soup', 'Rich tomato broth infused with fresh basil, served with crispy garlic croutons.', 150.00, 'starter', 'all', true, 'https://images.unsplash.com/photo-1547592165-e1d17fed6005?w=500&auto=format&fit=crop&q=60'),
        ('Crispy Veg Spring Rolls', 'Golden-fried wraps stuffed with seasoned julienned vegetables, served with sweet chili dip.', 220.00, 'starter', 'all', true, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60'),
        ('Garlic Cheese Toast', 'Slices of toasted baguette spread with garlic butter and melted mozzarella cheese.', 180.00, 'starter', 'all', true, 'https://images.unsplash.com/photo-1573145959956-e9fae6b8cd4e?w=500&auto=format&fit=crop&q=60'),
        
        -- Lunch Special Mains (Only visible during lunch)
        ('Royal Lunch Thali', 'A grand assortment of 3 curries, dal, rice, butter roti, pickle, and papad.', 350.00, 'main', 'lunch', true, 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=60'),
        ('Paneer Butter Masala Combo', 'Rich cottage cheese curry served alongside fragrant Jeera Rice and tandoori roti.', 280.00, 'main', 'lunch', true, 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=60'),
        ('Garden Fresh Veg Pulav', 'Long grain basmati rice slow cooked with fresh seasonal vegetables and aromatic spices.', 240.00, 'main', 'lunch', true, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60'),
        
        -- Dinner Special Mains (Only visible during dinner)
        ('Butter Chicken & Naan', 'Tender tandoori chicken cooked in a rich, creamy tomato gravy, served with butter naan.', 380.00, 'main', 'dinner', true, 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=60'),
        ('Gourmet Mushroom Risotto', 'Creamy Italian arborio rice simmered with wild button mushrooms, parmesan, and white wine.', 420.00, 'main', 'dinner', true, 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=500&auto=format&fit=crop&q=60'),
        ('Slow Cooked Lamb Chops', 'Juicy marinated lamb rack pan-seared and baked, served with rosemary mashed potatoes.', 590.00, 'main', 'dinner', true, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60'),

        -- Desserts (Available all day)
        ('Warm Chocolate Lava Cake', 'Delectable chocolate sponge cake with a rich molten center, served with vanilla ice cream.', 250.00, 'dessert', 'all', true, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=60'),
        ('Classic Tiramisu', 'Layered coffee-dipped ladyfingers and whipped mascarpone cream, dusted with cocoa.', 280.00, 'dessert', 'all', true, 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&auto=format&fit=crop&q=60'),

        -- Beverages (Available all day)
        ('Fresh Mint Mojito', 'A cooling muddle of fresh mint leaves, lime wedges, simple syrup, and carbonated soda.', 180.00, 'beverage', 'all', true, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60'),
        ('Watermelon Basil Juice', 'Cold-pressed fresh watermelon juice enhanced with sweet basil leaves and lemon.', 150.00, 'beverage', 'all', true, 'https://images.unsplash.com/photo-1570696516289-9e44324b13f5?w=500&auto=format&fit=crop&q=60')
    `;
    await pool.query(menuQuery);
    console.log('Culinary menu items seeded successfully.');

    console.log('Database seeding finished successfully!');
  } catch (error) {
    console.error('Error during database seeding:', error);
  } finally {
    await pool.end();
  }
}

seed();
