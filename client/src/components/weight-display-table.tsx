import React from 'react';

interface WeightDisplayTableProps {
  slipNo?: string;
  vehicleNo?: string;
  entryType?: string;
  firstWeight?: number | null;
  secondWeight?: number | null;
}

export default function WeightDisplayTable({
  slipNo = "",
  vehicleNo = "",
  entryType = "PURCHASE",
  firstWeight = null,
  secondWeight = null
}: WeightDisplayTableProps) {
  return (
    <div className="bg-white border-2 border-gray-300 rounded-lg shadow-lg p-4 w-64">
      {/* Header */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="bg-gray-100 border border-gray-400 p-1 text-center text-xs font-semibold">
          Slip No
        </div>
        <div className="bg-gray-100 border border-gray-400 p-1 text-center text-xs font-semibold">
          Vehicle No
        </div>
        <div className="bg-gray-100 border border-gray-400 p-1 text-center text-xs font-semibold">
          Entry Type
        </div>
      </div>

      {/* Values */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="border border-gray-400 p-1 text-center text-xs bg-white">
          {slipNo || "4451"}
        </div>
        <div className="border border-gray-400 p-1 text-center text-xs bg-white">
          {vehicleNo || "VRS-128"}
        </div>
        <div className="border border-gray-400 p-1 text-center text-xs bg-white text-blue-600 font-semibold">
          {entryType}
        </div>
      </div>

      {/* Weight Display Section */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-50 border border-blue-300 p-2 text-center">
            <div className="text-xs font-semibold text-blue-800 mb-1">First Weight</div>
            <div className="text-lg font-bold text-blue-900">
              {firstWeight ? `${firstWeight.toFixed(2)} kg` : '---'}
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-300 p-2 text-center">
            <div className="text-xs font-semibold text-gray-600 mb-1">Second Weight</div>
            <div className="text-lg font-bold text-gray-500">
              {secondWeight ? `${secondWeight.toFixed(2)} kg` : '---'}
            </div>
          </div>
        </div>
        
        {/* Net Weight */}
        <div className="bg-green-50 border border-green-300 p-2 text-center">
          <div className="text-xs font-semibold text-green-800 mb-1">Net Weight</div>
          <div className="text-lg font-bold text-green-900">
            {firstWeight && secondWeight ? 
              `${(firstWeight - secondWeight).toFixed(2)} kg` : 
              '---'
            }
          </div>
        </div>
      </div>

      {/* Load Data Button */}
      <button className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 text-xs rounded">
        Load Data
      </button>
    </div>
  );
}