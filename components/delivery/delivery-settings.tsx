'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, MapPin, DollarSign, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { KENYA_PROVINCES, KENYA_COUNTIES, COUNTY_TO_PROVINCE } from '@/lib/kenya-locations';

interface DeliverySettingsProps {
  user: any;
  onUpdate?: () => void;
}

export default function DeliverySettings({ user, onUpdate }: DeliverySettingsProps) {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    offersDelivery: user?.offersDelivery || false,
    offersPayAfterDelivery: user?.offersPayAfterDelivery || false,
    offersFreeDelivery: user?.offersFreeDelivery || false,
    deliveryProvinces: user?.deliveryProvinces || [],
    deliveryCounties: user?.deliveryCounties || [],
    minOrderForFreeDelivery: user?.minOrderForFreeDelivery || 0,
    deliveryFeePerKm: user?.deliveryFeePerKm || 0
  });

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/profile/delivery-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        toast.success('Delivery settings updated successfully');
        onUpdate?.();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update delivery settings');
      }
    } catch (error) {
      console.error('Error updating delivery settings:', error);
      toast.error('Failed to update delivery settings');
    } finally {
      setLoading(false);
    }
  };

  const handleProvinceToggle = (province: string) => {
    const newProvinces = settings.deliveryProvinces.includes(province)
      ? settings.deliveryProvinces.filter(p => p !== province)
      : [...settings.deliveryProvinces, province];
    
    setSettings(prev => ({ ...prev, deliveryProvinces: newProvinces }));
  };

  const handleCountyToggle = (county: string) => {
    const newCounties = settings.deliveryCounties.includes(county)
      ? settings.deliveryCounties.filter(c => c !== county)
      : [...settings.deliveryCounties, county];
    
    setSettings(prev => ({ ...prev, deliveryCounties: newCounties }));
  };

  const handleSelectAllProvinces = () => {
    if (settings.deliveryProvinces.length === KENYA_PROVINCES.length) {
      setSettings(prev => ({ ...prev, deliveryProvinces: [] }));
    } else {
      setSettings(prev => ({ ...prev, deliveryProvinces: [...KENYA_PROVINCES] }));
    }
  };

  const handleSelectAllCounties = () => {
    if (settings.deliveryCounties.length === KENYA_COUNTIES.length) {
      setSettings(prev => ({ ...prev, deliveryCounties: [] }));
    } else {
      setSettings(prev => ({ ...prev, deliveryCounties: [...KENYA_COUNTIES] }));
    }
  };

  const getCountiesByProvince = (province: string) => {
    return KENYA_COUNTIES.filter(county => COUNTY_TO_PROVINCE[county] === province);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Truck className="h-5 w-5" />
            <span>Delivery Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Delivery Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="offersDelivery"
                checked={settings.offersDelivery}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, offersDelivery: checked as boolean }))
                }
              />
              <Label htmlFor="offersDelivery" className="font-medium">
                I offer delivery services
              </Label>
            </div>

            {settings.offersDelivery && (
              <>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="offersPayAfterDelivery"
                    checked={settings.offersPayAfterDelivery}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, offersPayAfterDelivery: checked as boolean }))
                    }
                  />
                  <Label htmlFor="offersPayAfterDelivery">
                    I accept payment after delivery (COD)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="offersFreeDelivery"
                    checked={settings.offersFreeDelivery}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, offersFreeDelivery: checked as boolean }))
                    }
                  />
                  <Label htmlFor="offersFreeDelivery">
                    I offer free delivery
                  </Label>
                </div>

                {settings.offersFreeDelivery && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="minOrderForFreeDelivery">
                      Minimum order amount for free delivery (KSH)
                    </Label>
                    <Input
                      id="minOrderForFreeDelivery"
                      type="number"
                      min="0"
                      value={settings.minOrderForFreeDelivery}
                      onChange={(e) => 
                        setSettings(prev => ({ 
                          ...prev, 
                          minOrderForFreeDelivery: parseFloat(e.target.value) || 0 
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                )}

                {!settings.offersFreeDelivery && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="deliveryFeePerKm">
                      Delivery fee per km (KSH)
                    </Label>
                    <Input
                      id="deliveryFeePerKm"
                      type="number"
                      min="0"
                      step="0.01"
                      value={settings.deliveryFeePerKm}
                      onChange={(e) => 
                        setSettings(prev => ({ 
                          ...prev, 
                          deliveryFeePerKm: parseFloat(e.target.value) || 0 
                        }))
                      }
                      placeholder="0.00"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Delivery Coverage Areas */}
          {settings.offersDelivery && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Delivery Coverage Areas</span>
              </h3>

              {/* Provinces */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Provinces</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllProvinces}
                  >
                    {settings.deliveryProvinces.length === KENYA_PROVINCES.length ? 'Unselect All' : 'Select All'}
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {KENYA_PROVINCES.map((province) => (
                    <div
                      key={province}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        settings.deliveryProvinces.includes(province)
                          ? 'bg-green-50 border-green-200 text-green-800'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => handleProvinceToggle(province)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{province}</span>
                        {settings.deliveryProvinces.includes(province) && (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Counties */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Counties</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllCounties}
                  >
                    {settings.deliveryCounties.length === KENYA_COUNTIES.length ? 'Unselect All' : 'Select All'}
                  </Button>
                </div>

                {/* Group counties by province */}
                <div className="space-y-4">
                  {KENYA_PROVINCES.map((province) => {
                    const countiesInProvince = getCountiesByProvince(province);
                    const selectedCountiesInProvince = countiesInProvince.filter(county => 
                      settings.deliveryCounties.includes(county)
                    );

                    return (
                      <div key={province} className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-700">{province} Province</h4>
                          <Badge variant="outline">
                            {selectedCountiesInProvince.length}/{countiesInProvince.length}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {countiesInProvince.map((county) => (
                            <div
                              key={county}
                              className={`p-2 border rounded cursor-pointer transition-colors text-sm ${
                                settings.deliveryCounties.includes(county)
                                  ? 'bg-green-50 border-green-200 text-green-800'
                                  : 'bg-gray-50 hover:bg-gray-100'
                              }`}
                              onClick={() => handleCountyToggle(county)}
                            >
                              <div className="flex items-center justify-between">
                                <span>{county}</span>
                                {settings.deliveryCounties.includes(county) && (
                                  <Check className="h-3 w-3 text-green-600" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Summary */}
          {settings.offersDelivery && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Delivery Summary</h4>
              <div className="space-y-1 text-sm text-blue-800">
                <p>• Delivery offered: <span className="font-medium">Yes</span></p>
                <p>• Payment after delivery: <span className="font-medium">
                  {settings.offersPayAfterDelivery ? 'Yes' : 'No'}
                </span></p>
                <p>• Free delivery: <span className="font-medium">
                  {settings.offersFreeDelivery ? 'Yes' : 'No'}
                </span></p>
                {settings.offersFreeDelivery && settings.minOrderForFreeDelivery > 0 && (
                  <p>• Min order for free delivery: <span className="font-medium">
                    KSH {settings.minOrderForFreeDelivery}
                  </span></p>
                )}
                {!settings.offersFreeDelivery && settings.deliveryFeePerKm > 0 && (
                  <p>• Delivery fee: <span className="font-medium">
                    KSH {settings.deliveryFeePerKm}/km
                  </span></p>
                )}
                <p>• Coverage: <span className="font-medium">
                  {settings.deliveryProvinces.length} provinces, {settings.deliveryCounties.length} counties
                </span></p>
              </div>
            </div>
          )}

          <Button 
            onClick={handleSaveSettings} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Saving...' : 'Save Delivery Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
