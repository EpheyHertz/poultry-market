export const KENYA_PROVINCES = [
  'Central',
  'Coast',
  'Eastern',
  'North Eastern',
  'Nyanza',
  'Rift Valley',
  'Western'
] as const;

export const KENYA_COUNTIES = [
  // Central Province
  'Kiambu',
  'Kirinyaga',
  'Murang\'a',
  'Nyandarua',
  'Nyeri',
  
  // Coast Province
  'Kilifi',
  'Kwale',
  'Lamu',
  'Mombasa',
  'Taita-Taveta',
  'Tana River',
  
  // Eastern Province
  'Embu',
  'Isiolo',
  'Kitui',
  'Machakos',
  'Makueni',
  'Marsabit',
  'Meru',
  'Tharaka-Nithi',
  
  // North Eastern Province
  'Garissa',
  'Mandera',
  'Wajir',
  
  // Nyanza Province
  'Homa Bay',
  'Kisii',
  'Kisumu',
  'Migori',
  'Nyamira',
  'Siaya',
  
  // Rift Valley Province
  'Baringo',
  'Bomet',
  'Elgeyo-Marakwet',
  'Kajiado',
  'Kericho',
  'Laikipia',
  'Nakuru',
  'Nandi',
  'Narok',
  'Samburu',
  'Trans-Nzoia',
  'Turkana',
  'Uasin Gishu',
  'West Pokot',
  
  // Western Province
  'Bungoma',
  'Busia',
  'Kakamega',
  'Vihiga',
  
  // Nairobi (Special area)
  'Nairobi'
] as const;

export const COUNTY_TO_PROVINCE = {
  // Central Province
  'Kiambu': 'Central',
  'Kirinyaga': 'Central',
  'Murang\'a': 'Central',
  'Nyandarua': 'Central',
  'Nyeri': 'Central',
  
  // Coast Province
  'Kilifi': 'Coast',
  'Kwale': 'Coast',
  'Lamu': 'Coast',
  'Mombasa': 'Coast',
  'Taita-Taveta': 'Coast',
  'Tana River': 'Coast',
  
  // Eastern Province
  'Embu': 'Eastern',
  'Isiolo': 'Eastern',
  'Kitui': 'Eastern',
  'Machakos': 'Eastern',
  'Makueni': 'Eastern',
  'Marsabit': 'Eastern',
  'Meru': 'Eastern',
  'Tharaka-Nithi': 'Eastern',
  
  // North Eastern Province
  'Garissa': 'North Eastern',
  'Mandera': 'North Eastern',
  'Wajir': 'North Eastern',
  
  // Nyanza Province
  'Homa Bay': 'Nyanza',
  'Kisii': 'Nyanza',
  'Kisumu': 'Nyanza',
  'Migori': 'Nyanza',
  'Nyamira': 'Nyanza',
  'Siaya': 'Nyanza',
  
  // Rift Valley Province
  'Baringo': 'Rift Valley',
  'Bomet': 'Rift Valley',
  'Elgeyo-Marakwet': 'Rift Valley',
  'Kajiado': 'Rift Valley',
  'Kericho': 'Rift Valley',
  'Laikipia': 'Rift Valley',
  'Nakuru': 'Rift Valley',
  'Nandi': 'Rift Valley',
  'Narok': 'Rift Valley',
  'Samburu': 'Rift Valley',
  'Trans-Nzoia': 'Rift Valley',
  'Turkana': 'Rift Valley',
  'Uasin Gishu': 'Rift Valley',
  'West Pokot': 'Rift Valley',
  
  // Western Province
  'Bungoma': 'Western',
  'Busia': 'Western',
  'Kakamega': 'Western',
  'Vihiga': 'Western',
  
  // Nairobi (Special area)
  'Nairobi': 'Central'
} as const;

export type KenyaProvince = typeof KENYA_PROVINCES[number];
export type KenyaCounty = typeof KENYA_COUNTIES[number];
