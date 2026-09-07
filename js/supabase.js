// 🔑 Supabase Configuration
const SUPABASE_URL = 'https://tpwxadfxxbrrtasfgkjr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwd3hhZGZ4eGJycnRhc2Zna2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMDQxMTQsImV4cCI6MjEwMzc4MDExNH0.mXt7imVZcnM5ya5fhKRyMQaStQnGedaM9_jsD9h15xg';

// Initialize and expose as both supabase and supabaseClient for consistency
const { createClient } = window.supabase;
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabase = client;
window.supabaseClient = client;

// 📷 Helper: Upload single image to Storage inside the user's secure folder
async function uploadProductImage(file, prefix) {
  if (!file) return null;

  const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
  if (authError || !user) {
    throw new Error('You must be logged in to upload images.');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

  const { data, error } = await window.supabaseClient.storage
    .from('product-images')
    .upload(fileName, file);

  if (error) {
    throw new Error(`Failed to upload ${prefix} image: ${error.message}`);
  }

  const { data: urlData } = window.supabaseClient.storage
    .from('product-images')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

// 📋 Helper: Insert product row into Database
async function insertProductListing(listingData) {
  const { data, error } = await window.supabaseClient
    .from('products')
    .insert([listingData])
    .select();

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  return data;
}