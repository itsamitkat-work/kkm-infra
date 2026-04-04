// Mock client data for the searchable dropdown
export interface Client {
  id: number;
  name: string;
  address?: string;
  gstn?: string;
}

export const MOCK_CLIENTS: Client[] = [
  {
    id: 1,
    name: 'ABC Construction Ltd',
    address: '123 Main Street, Mumbai, Maharashtra 400001',
    gstn: '27AABCU9603R1ZX',
  },
  {
    id: 2,
    name: 'XYZ Infrastructure Pvt Ltd',
    address: '456 Business Park, Delhi, Delhi 110001',
    gstn: '07AABCU9603R1ZY',
  },
  {
    id: 3,
    name: 'PQR Builders & Developers',
    address: '789 Industrial Area, Bangalore, Karnataka 560001',
    gstn: '29AABCU9603R1ZZ',
  },
  {
    id: 4,
    name: 'DEF Engineering Works',
    address: '321 Tech Hub, Pune, Maharashtra 411001',
    gstn: '27AABCU9603R1ZA',
  },
  {
    id: 5,
    name: 'GHI Construction Company',
    address: '654 Commercial Complex, Chennai, Tamil Nadu 600001',
    gstn: '33AABCU9603R1ZB',
  },
  {
    id: 6,
    name: 'JKL Infrastructure Solutions',
    address: '987 Corporate Plaza, Hyderabad, Telangana 500001',
    gstn: '36AABCU9603R1ZC',
  },
  {
    id: 7,
    name: 'MNO Builders Group',
    address: '147 Residential Area, Kolkata, West Bengal 700001',
    gstn: '19AABCU9603R1ZD',
  },
  {
    id: 8,
    name: 'STU Construction & Engineering',
    address: '258 Industrial Estate, Ahmedabad, Gujarat 380001',
    gstn: '24AABCU9603R1ZE',
  },
  {
    id: 9,
    name: 'VWX Infrastructure Ltd',
    address: '369 Business District, Jaipur, Rajasthan 302001',
    gstn: '08AABCU9603R1ZF',
  },
  {
    id: 10,
    name: 'YZA Development Corporation',
    address: '741 Commercial Street, Kochi, Kerala 682001',
    gstn: '32AABCU9603R1ZG',
  },
];

// Helper function to get client options for the dropdown
export const getClientOptions = () => {
  return MOCK_CLIENTS.map((client) => ({
    value: client.id.toString(),
    label: client.name,
    id: client.id,
  }));
};

// Helper function to get client by ID
export const getClientById = (id: string | number): Client | undefined => {
  return MOCK_CLIENTS.find((client) => client.id === Number(id));
};

// Helper function to get client by name
export const getClientByName = (name: string): Client | undefined => {
  return MOCK_CLIENTS.find((client) => client.name === name);
};
