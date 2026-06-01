import { useState, useEffect } from 'react';
import { 
  Home, Search, Building2, Trash2, LayoutGrid, CheckCircle2, Clock
} from 'lucide-react';
import { Header } from '../../components/admin/Header';
import { adminGetAllProperties, deleteProperty } from '../../services/api';

interface PropertyData {
  id: number;
  title: string;
  description: string;
  address: string;
  city: string;
  property_type: string;
  price: number;
  available: boolean;
  created_at: string;
  owner: number;
  images: Array<{ id: number; image: string }>;
  has_confirmed_booking?: boolean;
}

const PropertyManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [filterType, setFilterType] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const data = await adminGetAllProperties();
      setProperties(data);
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProperty = async (propertyId: number, propertyTitle: string) => {
    const confirmed = window.confirm(`Delete "${propertyTitle}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      await deleteProperty(propertyId);
      setProperties(properties.filter(p => p.id !== propertyId));
    } catch (error) {
      console.error("Failed to delete property:", error);
    }
  };

  const filteredProperties = properties.filter((prop) => {
    const matchesSearch = 
      prop.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prop.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prop.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || prop.property_type === filterType;
    return matchesSearch && matchesType;
  });

  const stats = [
    { label: 'Total Properties', value: properties.length, icon: Home, color: 'text-purple-500', bg: 'bg-purple-50' },
    { label: 'Available', value: properties.filter(p => p.available).length, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
    { label: 'Booked', value: properties.filter(p => !p.available).length, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Rooms', value: properties.filter(p => p.property_type === 'room').length, icon: Building2, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Apartments', value: properties.filter(p => p.property_type === 'apartment').length, icon: LayoutGrid, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { label: 'Houses', value: properties.filter(p => p.property_type === 'house').length, icon: Home, color: 'text-pink-500', bg: 'bg-pink-50' },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12 font-sans text-gray-800">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex justify-between items-end mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Home className="text-[#A989C8]" size={24} />
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Property Management</h1>
            </div>
            <p className="text-gray-500 font-medium">Manage all property listings and availability</p>
          </div>
          <div className="relative w-full max-w-xs hidden sm:block">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search properties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#A989C8]/30 focus:border-[#A989C8] outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5 mb-8">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.bg}`}>
                  <Icon size={20} className={s.color} />
                </div>
                <p className="text-2xl font-black text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 font-bold uppercase mt-0.5">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
          <div className="bg-white rounded-[2rem] border border-gray-100 p-1.5 shadow-sm inline-flex">
            {['', 'room', 'apartment', 'house', 'land'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                  filterType === type
                    ? 'bg-gradient-to-r from-[#A989C8] to-purple-700 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {type ? type.charAt(0).toUpperCase() + type.slice(1) + 's' : 'All'}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:hidden">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search properties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#A989C8]/30 focus:border-[#A989C8] outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="bg-white rounded-[2rem] p-10 border border-gray-100 shadow-sm text-center">
              <div className="w-10 h-10 border-4 border-[#A989C8] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500 font-bold">Loading properties...</p>
            </div>
          </div>
        )}

        {/* Property List */}
        {!loading && filteredProperties.length > 0 && (
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50">
              <h3 className="font-black text-gray-900">{filteredProperties.length} {filteredProperties.length === 1 ? 'Property' : 'Properties'} Found</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {filteredProperties.map((property) => (
                <div key={property.id} className="px-6 py-5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-5">
                    {/* Image */}
                    <div className="w-20 h-20 rounded-2xl bg-gray-100 overflow-hidden shrink-0">
                      {property.images && property.images.length > 0 ? (
                        <img
                          src={`http://127.0.0.1:8000${property.images[0].image}`}
                          alt={property.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <Home size={24} className="text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-gray-900 text-base truncate">{property.title}</h4>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{property.address}, {property.city}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black ${
                          property.has_confirmed_booking
                            ? 'bg-orange-50 text-orange-700 border border-orange-200'
                            : 'bg-green-50 text-green-700 border border-green-200'
                        }`}>
                          {property.has_confirmed_booking ? 'Booked' : 'Available'}
                        </span>
                        <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
                          {property.property_type}
                        </span>
                        <span className="text-sm font-bold text-gray-700">NPR {property.price.toLocaleString()}/mo</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() => handleDeleteProperty(property.id, property.title)}
                      className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                      title="Delete Property"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading && filteredProperties.length === 0 && (
          <div className="bg-white rounded-[2rem] border border-gray-100 p-16 text-center shadow-sm">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
              <Home size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-600 font-bold text-lg">
              {searchTerm || filterType ? "No matching results" : "No properties found"}
            </p>
            {(searchTerm || filterType) && (
              <button
                onClick={() => { setSearchTerm(''); setFilterType(''); }}
                className="mt-3 text-sm text-[#A989C8] font-black hover:text-purple-800 transition-colors uppercase tracking-wider"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default PropertyManagement;
