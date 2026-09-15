export const mockUser = {
  contractor: {
    id: '1',
    email: 'john@mrbuilder.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1 (415) 555-0123',
    role: 'contractor' as const,
    avatar: null,
    professionalTitle: 'Senior Installer',
    rating: 4.9,
    jobsCompleted: 47,
  },
  consumer: {
    id: '2',
    email: 'amirali@mrbuilder.com',
    firstName: 'Amirali',
    lastName: 'Smith',
    phone: '+1 (415) 555-0456',
    role: 'consumer' as const,
    avatar: null,
  },
};

export const mockJobs = [
  {
    id: '1',
    title: 'DIY Pergola Installation',
    location: 'Palo Alto, CA',
    description: 'Full bathroom renovation including tile work, plumbing fixtures, and vanity installation.',
    startDate: '12.05.25',
    endDate: '22.05.25',
    payment: 4500,
    status: 'posted',
    category: 'Residential',
    consumer: mockUser.consumer,
    structureDetails: {
      structureType: 'Aluminum Louver Shade',
      buildingType: 'Free Standing',
      sideEnclosure: 'Government',
      width: "14'",
      length: "24'",
      height: "10'",
    },
    images: [],
    address: '1251 Middlefield Road, Palo Alto, CA 94301',
    lat: 37.4419,
    lng: -122.1430,
  },
  {
    id: '2',
    title: 'Bathroom Renovation',
    location: 'Palo Alto, CA',
    description: 'Full bathroom renovation including tile work, plumbing fixtures, and vanity installation.',
    startDate: '12.05.25',
    endDate: '22.05.25',
    payment: 4500,
    status: 'posted',
    category: 'Residential',
    consumer: mockUser.consumer,
    structureDetails: {
      structureType: 'Non-Motorized Glass Side Enclosure',
      buildingType: 'Attached',
      width: "14'",
      length: "24'",
      height: "10'",
    },
    images: [],
    address: '320 Whitfield Road, Palo Alto, CA 94305',
    lat: 37.4300,
    lng: -122.1500,
  },
];

export const mockHistory = {
  completed: [
    {
      id: '3',
      title: 'Bathroom renovation',
      location: 'Palo Alto, CA',
      payment: 4500,
      startDate: '12.05.25',
      endDate: '22.05.25',
      status: 'confirmed',
      timeline: [
        { label: 'Accepted', date: 'May 6, 2025', done: true },
        { label: 'Job Started', date: 'May 10, 2025', done: true },
        { label: 'You completed the job', date: 'May 20, 2025', done: true },
        { label: 'Client confirmed', date: 'May 21, 2025', done: true },
        { label: 'Rating & Feedback', date: 'May 21, 2025', done: true },
      ],
      rating: { contractor: 5.0, consumer: 5.0 },
      paymentDetails: { basePay: 4500, tip: 50, serviceFee: -20, total: 4530 },
      contractor: mockUser.contractor,
      consumer: mockUser.consumer,
    },
  ],
  cancelled: [
    {
      id: '4',
      title: 'Pergola Installation',
      date: 'May 12, 2025',
      cancelledBy: 'John D.',
      reason: 'Unexpected emergency',
      feeApplied: false,
    },
    {
      id: '5',
      title: 'Deck construction',
      date: 'May 12, 2025',
      cancelledBy: 'You',
      reason: 'Unfortunately, I won\'t be able to make it at the scheduled time due to an urgent personal matter.',
      feeApplied: true,
      feeAmount: 1000,
      feePercent: 1,
    },
  ],
};

export const mockConversations = [
  {
    id: '1',
    user: { name: 'Jack Turner', avatar: null },
    lastMessage: 'Lorem ipsum dolor sit amet, consectetur adi...',
    time: '18:41',
    unread: 2,
    isCurrent: true,
  },
  {
    id: '2',
    user: { name: 'Sophia B.', avatar: null },
    lastMessage: 'Integer eu pharetra lorem, vel portitor tortor. Ut cu...',
    time: '20.04.2025',
    unread: 0,
    isCurrent: false,
  },
  {
    id: '3',
    user: { name: 'Orlando D.', avatar: null },
    lastMessage: 'Fusce tincidunt felis id lectus aliquet, non lacinia eros',
    time: '12.02.2025',
    unread: 0,
    isCurrent: false,
  },
];

export const mockMessages = [
  { id: '1', senderId: '2', type: 'text', content: 'Hey team, I\'ve finished with the requirements doc!', time: '11:40am', date: '20.05.2025' },
  { id: '2', senderId: '2', type: 'voice', duration: '00:28', time: '10:16am', date: '20.05.2025' },
  { id: '3', senderId: '2', type: 'file', fileName: 'Tech requirements.pdf', fileSize: '1.2 MB', time: '11:40am', date: '20.05.2025' },
  { id: '4', senderId: '1', type: 'text', content: 'Awesome! Thanks.', time: '11:41am', date: '20.05.2025' },
  { id: '5', senderId: '2', type: 'text', content: 'Hey Olivia, can you please review the latest design?', time: '2:20pm', date: 'Today' },
  { id: '6', senderId: '1', type: 'text', content: 'Sure thing, I\'ll have a look today.', time: '2:20pm', date: 'Today' },
];

export const mockNotifications = [
  { id: '1', type: 'job_accepted', title: 'You accepted a job.', body: 'Don\'t forget to start the task on May 10 at 09:00 AM/', time: '3 hours ago', read: false },
  { id: '2', type: 'job_confirmed', title: 'Client confirmed job completion', body: '$ 500 was transferred to your wallet.', time: '3 hours ago', read: false },
  { id: '3', type: 'new_job', title: 'New job near you!', body: 'Pergola Installation job posted in Palo Alto. CA.', time: '3 hours ago', read: true },
  { id: '4', type: 'job_disputed', title: 'Client didn\'t confirm your completio.', body: 'Some parts of the job are still incomplete/ Please review', time: '3 hours ago', read: true },
  { id: '5', type: 'job_cancelled', title: 'Job was cancelled by client', body: 'Some parts of the job are still incomplete/ Please review', time: '3 hours ago', read: true },
  { id: '6', type: 'job_cancelled', title: 'You cancelled the job', body: '$ 5 (1%) service fee has been applied for canceling the job.', time: '3 hours ago', read: true },
];

export const mockPayments = {
  balance: {
    pending: 1245.50,
    received: 8750.00,
  },
  methods: [
    { id: '1', type: 'credit_card', brand: 'Visa', lastFour: '4532', isDefault: true },
    { id: '2', type: 'credit_card', brand: 'Mastercard', lastFour: '1234', isDefault: false },
  ],
  transactions: [
    { id: '1', title: 'Pergola installation', date: 'May 12, 2025', amount: 4500, type: 'earning' },
    { id: '2', title: 'Patio construction/Palo Alto/Calif...', date: 'Nov 4, 2024', amount: -1500, type: 'service_fee' },
    { id: '3', title: 'Patio construction/Palo Alto/Calif...', date: 'Nov 4, 2024', amount: -10750, type: 'payout' },
  ],
};

export const mockConsumerRequests = [
  {
    id: '1',
    title: 'Annual Maintenance Check',
    status: 'Confirmed',
    date: 'Aug 15, 2023',
    time: '9:00 AM - 11:00 AM',
    technician: 'Mike Johnson',
  },
];

export const mockConsumerProducts = [
  { id: '1', name: 'Pergola name', category: 'Category', image: null },
  { id: '2', name: 'Pergola name', category: 'Category', image: null },
];

export const mockSupplyProducts = [
  { id: '1', name: 'Construction Gloves', price: 29.99, image: null, isTopSeller: true, category: 'Safety' },
  { id: '2', name: 'Hammer Set', price: 49.99, image: null, isTopSeller: true, category: 'Tools' },
  { id: '3', name: 'Safety Goggles', price: 15.99, image: null, isTopSeller: false, category: 'Safety' },
];
