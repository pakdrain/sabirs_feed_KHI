import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PurchaseFormLayoutProps {
  formData: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isEditMode: boolean;
  onSave: () => void;
  loading: boolean;
}

export default function PurchaseFormLayout({
  formData,
  handleChange,
  isEditMode,
  onSave,
  loading
}: PurchaseFormLayoutProps) {
  return (
    <div className="bg-gray-100 p-4 rounded-lg">
      {/* Top Navigation Buttons */}
      <div className="flex gap-1 mb-4">
        <Button className={`px-4 py-1 text-sm ${isEditMode ? 'bg-gray-300' : 'bg-blue-500 text-white'}`}>
          Purchase
        </Button>
        <Button className="px-4 py-1 text-sm bg-gray-300">Sale</Button>
        <Button className="px-4 py-1 text-sm bg-gray-300">Offline</Button>
      </div>

      {/* Main Form Grid */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        {/* Left Column */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium text-gray-700">Bardana Type</Label>
            <Input 
              name="bardanaType"
              value={formData.bardanaType || "PP BAGS 100 GR."}
              onChange={handleChange}
              className="h-8 text-sm"
            />
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-700">Wht Per Bags</Label>
            <Input 
              name="wtPerBag"
              value={formData.wtPerBag || "1"}
              onChange={handleChange}
              className="h-8 text-sm"
              type="number"
            />
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-700">No Of Bags</Label>
            <Input 
              name="noOfBags"
              value={formData.noOfBags || "300"}
              onChange={handleChange}
              className="h-8 text-sm"
              type="number"
            />
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-700">Bardana Wht</Label>
            <Input 
              name="bardanaWeight"
              value={formData.bardanaWeight || "30"}
              onChange={handleChange}
              className="h-8 text-sm"
              type="number"
            />
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-700">Quality Ded</Label>
            <Input 
              name="qualityDed"
              value={formData.qualityDed || "0"}
              onChange={handleChange}
              className="h-8 text-sm"
              type="number"
            />
          </div>
        </div>

        {/* Middle Column */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium text-gray-700">IGP #</Label>
            <Input 
              name="igpNo"
              value={formData.igpNo || "4560"}
              onChange={handleChange}
              className="h-8 text-sm"
            />
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-700">IGP Date</Label>
            <Input 
              name="igpDate"
              value={formData.igpDate || "30-APR-2025"}
              onChange={handleChange}
              className="h-8 text-sm"
              type="date"
            />
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-700">Vendor</Label>
            <Input 
              name="vendor"
              value={formData.vendor || "BABAR & COMPANY"}
              onChange={handleChange}
              className="h-8 text-sm"
            />
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-700">Vehicle No</Label>
            <Input 
              name="vehicleNo"
              value={formData.vehicleNo || "VRS-128"}
              onChange={handleChange}
              className="h-8 text-sm"
            />
          </div>
          
          <div className="col-span-2">
            <Label className="text-sm font-medium text-gray-700">Weight</Label>
            <div className="flex">
              <Input 
                name="weight"
                value={formData.weight || ""}
                onChange={handleChange}
                className="h-8 text-sm flex-1"
                type="number"
              />
              <span className="ml-2 text-sm self-center">% Bags</span>
            </div>
          </div>
        </div>

        {/* Right Column - Weights */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium text-gray-700">Supp's Weight</Label>
            <Input 
              name="superweight"
              value={formData.superweight || "-30"}
              onChange={handleChange}
              className="h-8 text-sm"
              type="number"
              readOnly
            />
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-700">Sip.Wht - Bardana</Label>
            <Input 
              name="sipWhtBardana"
              value={formData.sipWhtBardana || "-28250"}
              onChange={handleChange}
              className="h-8 text-sm"
              type="number"
              readOnly
            />
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-700">S.Wht - Our Wht</Label>
            <Input 
              name="sWhtOurWht"
              value={formData.sWhtOurWht || "-28250"}
              onChange={handleChange}
              className="h-8 text-sm"
              type="number"
              readOnly
            />
          </div>
          
          <div className="mt-4">
            <Button className="bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-2 font-medium">
              Deduction +
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Table */}
      <div className="bg-green-100 border border-gray-300 rounded">
        <div className="grid grid-cols-6 gap-px bg-gray-300">
          <div className="bg-green-200 p-2 text-center text-sm font-medium">Po No</div>
          <div className="bg-green-200 p-2 text-center text-sm font-medium">Item Code</div>
          <div className="bg-green-200 p-2 text-center text-sm font-medium">Item Description</div>
          <div className="bg-green-200 p-2 text-center text-sm font-medium">Po Qty</div>
          <div className="bg-green-200 p-2 text-center text-sm font-medium">Igp Qty</div>
          <div className="bg-green-200 p-2 text-center text-sm font-medium">Balance Qty</div>
        </div>
        <div className="grid grid-cols-6 gap-px bg-gray-300">
          <div className="bg-green-100 p-2 text-center text-sm">4148</div>
          <div className="bg-green-100 p-2 text-center text-sm">030101002</div>
          <div className="bg-green-100 p-2 text-center text-sm">WHEAT</div>
          <div className="bg-green-100 p-2 text-center text-sm">10500</div>
          <div className="bg-green-100 p-2 text-center text-sm">10500</div>
          <div className="bg-green-100 p-2 text-center text-sm">0</div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-4">
        <Button 
          onClick={onSave}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
        >
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}