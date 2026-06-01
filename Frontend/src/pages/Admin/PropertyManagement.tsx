import { useState, useEffect } from 'react';
import { 
  Home, Search, Building2, Trash2, LayoutGrid, CheckCircle2, Clock, X, ChevronLeft, ChevronRight, MapPin, DollarSign, Bed, Bath
} from 'lucide-react';
import { Header } from '../../components/admin/Header';
import { adminGetAllProperties, deleteProperty } from '../../services/api';

const API_BASE = 'http://127.0.0.1:8000';

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
  bedrooms?: number;
  bathrooms?: number;
  area_size?: number;
}

const PropertyManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [filterType, setFilterType] = useState('');
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewList, setPreviewList] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

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

  const openPreview = (images: Array<{ id: number; image: string }>, index: number) => {
    const urls = images.map(img => `${API_BASE}${img.image}`);
    setPreviewList(urls);
    setPreviewIndex(index);
    setPreviewImage(urls[index]);
  };

  const filteredProperties = properties.filter((prop) => {
    const matchesSearch = 
      prop.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prop.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prop.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || prop.property_type === filterType;
    return matchesSearch && matchesType;
  });

  const typeIcons: Record<string, any> = {
    room: Building2,
    apartment: LayoutGrid,
    house: Home,
    land: MapPin,
  };

  const stats = [
    { label: 'Total', value: properties.length, icon: Home, color: 'text-[#A989C8]', bg: 'bg-[#F3EDF9]' },
    { label: 'Available', value: properties.filter(p => p.available).length, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
    { label: 'Booked', value: properties.filter(p => !p.available).length, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Rooms', value: properties.filter(p => p.property_type === 'room').length, icon: Building2, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Apartments', value: properties.filter(p => p.property_type === 'apartment').length, icon: LayoutGrid, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { label: 'Houses', value: properties.filter(p => p.property_type === 'house').length, icon: Home, color: 'text-pink-500', bg: 'bg-pink-50' },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12 font-sans text-gray-800">
      <Header />

      {/* Image Lightbox */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors" onClick={() => setPreviewImage(null)}>
            <X size={28} />
          </button>
          {previewList.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-black/30 hover:bg-black/50 rounded-full p-2 transition-all"
                onClick={(e) => { e.stopPropagation(); setPreviewIndex(i => (i - 1 + previewList.length) % previewList.length); setPreviewImage(previewList[(previewIndex - 1 + previewList.length) % previewList.length]); }}
              >
                <ChevronLeft size={28} />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-black/30 hover:bg-black/50 rounded-full p-2 transition-all"
                onClick={(e) => { e.stopPropagation(); setPreviewIndex(i => (i + 1) % previewList.length); setPreviewImage(previewList[(previewIndex + 1) % previewList.length]); }}
              >
                <ChevronRight size={28} />
              </button>
            </>
          )}
          <img
            src={previewImage}
            alt="Property"
            className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {previewList.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs font-bold px-3 py-1.5 rounded-full">
              {previewIndex + 1} / {previewList.length}
            </div>
          )}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex justify-between items-end mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-gradient-to-br from-[#A989C8] to-[#A87DC2] rounded-xl shadow-sm">
                <Home className="text-white" size={20} />
              </div>
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
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white rounded-[2rem] p-5 border border-gray-100 shadow-sm">
                <div className={`${s.bg} ${s.color} w-fit p-2.5 rounded-xl mb-4`}>
                  <Icon size={18} />
                </div>
                <p className="text-2xl font-black text-gray-900">{s.value}</p>
                <p className="text-xs font-medium text-gray-500 mt-0.5">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
          {/* Tab Bar */}
          <div className="flex border-b border-gray-100">
            {[
              { key: '', label: 'All', count: properties.length },
              { key: 'room', label: 'Rooms', count: properties.filter(p => p.property_type === 'room').length },
              { key: 'apartment', label: 'Apartments', count: properties.filter(p => p.property_type === 'apartment').length },
              { key: 'house', label: 'Houses', count: properties.filter(p => p.property_type === 'house').length },
              { key: 'land', label: 'Land', count: properties.filter(p => p.property_type === 'land').length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterType(tab.key)}
                className={`flex-1 py-4 text-xs font-black uppercase tracking-widest relative transition-all ${
                  filterType === tab.key ? 'text-[#A989C8]' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.label}
                <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full ${
                  filterType === tab.key ? 'bg-[#F3EDF9] text-[#A989C8]' : 'bg-gray-100 text-gray-400'
                }`}>
                  {tab.count}
                </span>
                {filterType === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#A989C8] to-[#A87DC2]" />}
              </button>
            ))}
          </div>

          {/* Property Grid */}
          <div className="p-6">
            {loading ? (
              <div className="h-64 flex items-center justify-center text-gray-400 font-bold italic animate-pulse">Loading...</div>
            ) : filteredProperties.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-gray-300">
                <Search size={48} className="mb-4 opacity-20" />
                <p className="font-bold uppercase tracking-widest text-sm">No properties found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProperties.map((prop) => {
                  const TypeIcon = typeIcons[prop.property_type] || Home;
                  return (
                    <div key={prop.id} className="group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300">
                      {/* Image */}
                      <div className="relative h-52 overflow-hidden bg-gray-100">
                        {prop.images && prop.images.length > 0 ? (
                          <>
                            <img
                              src={`${API_BASE}${prop.images[0].image}`}
                              alt={prop.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                              onClick={() => openPreview(prop.images, 0)}
                            />
                            {/* Image count badge */}
                            {prop.images.length > 1 && (
                              <button
                                onClick={() => openPreview(prop.images, 0)}
                                className="absolute bottom-3 right-3 bg-black/60 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm hover:bg-black/80 transition-colors"
                              >
                                +{prop.images.length - 1} more
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Home size={48} />
                          </div>
                        )}
                        {/* Status badges */}
                        <div className="absolute top-3 left-3 flex gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm backdrop-blur-sm ${
                            prop.available ? 'bg-green-500/90 text-white' : 'bg-orange-500/90 text-white'
                          }`}>
                            {prop.available ? 'Available' : 'Booked'}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-white/90 text-[#A989C8] text-[10px] font-black uppercase tracking-wider shadow-sm backdrop-blur-sm flex items-center gap-1">
                            <TypeIcon size={10} />
                            {prop.property_type}
                          </span>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="font-bold text-gray-900 truncate text-base">{prop.title}</h3>
                          {prop.has_confirmed_booking && (
                            <span className="shrink-0 bg-green-50 text-green-600 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                              <Clock size={8} /> Active Booking
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mb-3">
                          <MapPin size={10} /> {prop.address}, {prop.city}
                        </p>

                        {/* Features */}
                        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-50">
                          {prop.bedrooms != null && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Bed size={12} className="text-gray-400" /> {prop.bedrooms} Bed
                            </span>
                          )}
                          {prop.bathrooms != null && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Bath size={12} className="text-gray-400" /> {prop.bathrooms} Bath
                            </span>
                          )}
                          {prop.area_size != null && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <LayoutGrid size={12} className="text-gray-400" /> {prop.area_size} sq.ft
                            </span>
                          )}
                        </div>

                        {/* Price + Action */}
                        <div className="flex items-center justify-between">
                          <p className="text-xl font-black text-gray-900">
                            Rs. {Number(prop.price).toLocaleString()}
                          </p>
                          <button
                            onClick={() => handleDeleteProperty(prop.id, prop.title)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 text-red-500 rounded-xl text-[11px] font-bold hover:bg-red-100 transition-colors"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PropertyManagement;
