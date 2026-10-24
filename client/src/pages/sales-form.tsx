import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  Plus,
  Scale,
  Download,
  Upload,
  Eye,
  Save,
  EyeOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import WeightIndicator from "@/components/weight-indicator";
import { useConfig } from "@/lib/config-context";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import VideoStreamFullscreen from "@/components/video-stream-fullscreen";
import { format } from "date-fns";
import { useComPort } from "@/Comportcontext";
import axios from "axios";




export default function SalesForm() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchSlipNo, setSearchSlipNo] = useState("");
  const [searchVehicleNo, setSearchVehicleNo] = useState("");
  const customerSearchInputRef = useRef<HTMLInputElement>(null);
  const itemSearchInputRef = useRef<HTMLInputElement>(null);
const nextFieldRef = useRef<HTMLInputElement>(null); // <-- create the ref for the next input
const [selectedForm, setSelectedForm] = useState<"purchase" | "sales" | "salesReturn" | "soldNote">("sales");
const [cameFromPrevious, setCameFromPrevious] = useState(false);
const [fieldHighlighted, setFieldHighlighted] = useState(false);
// Inside your component
const [isCustomerSelected, setIsCustomerSelected] = useState(false);
const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
const [openCustomerLovRowIndex, setOpenCustomerLovRowIndex] = useState<number | null>(null);
const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(-1);
const [focusedCustomerRowIndex, setFocusedCustomerRowIndex] = useState<number | null>(null);
const [openBranchLovRowIndex, setOpenBranchLovRowIndex] = useState<number | null>(null);
const [openItemLovRowIndex, setOpenItemLovRowIndex] = useState<number | null>(null);
const [disableSaveButton, setDisableSaveButton] = useState(false);
const customerLovRef = useRef<HTMLDivElement>(null);



// At the top of your component
const [details, setdetails] = useState<
  { customerName: string; customerId: number | null }[]
>(
  Array.from({ length: 8 }, () => ({
    customerName: "",
    customerId: null,
  }))
);


  // Sales data state - mapped to database columns
const [salesData, setSalesData] = useState<any[]>(
  Array.from({ length: 8 }, () => ({
    doId: "",             // do_id
    dcNo: "",             // manual_dc_no
    doNo: "",             // do_no
    customerId: "",       // ✅ add this field (maps to customer_id)
    customerName: "",     // customer_name
    vehicleNo: "",        // vehicle_no
    doDate: "",           // do_date
    itemDescription: "",  // item_desc
    dcQty: "",            // dc_qty
    doQty: "",            // do_qty
    branch: "",
        freight: "",// ✅ Add this

  }))
);

// Non-empty rows filter
const nonEmptyRows = salesData.filter(
  (row) =>
    row.dcNo ||
    row.doNo ||
    row.customerId || // ✅ include this too
    row.customerName ||
    row.vehicleNo ||
    row.itemDescription ||
    row.dcQty ||
    row.doQty
);



// ------------------------------------------------------------------

const fetchReportData = async (wbId: number) => {
  try {
    const response = await fetch(`/api/form-report/${wbId}`);
    const result = await response.json();

    if (result.success && result.data) {
      const raw = result.data;
console.log("🔍 raw.vehicle_no:", raw.vehicle_no);
console.log("🔍 raw.details[0]?.vehicle_no:", raw.details?.[0]?.vehicle_no);
      // ✅ sirf DB data — koi "0" fallback nahi numbers mein
      return {
        ...raw,
        slipNo:           raw.slip_no || "",
        vehicleNo:  raw.vehicle_no || raw.details?.[0]?.vehicle_no || "",
        firstWeight:      raw.first_weight ? String(raw.first_weight) : "",
        secondWeight:     raw.second_weight ? String(raw.second_weight) : "",
        netWeight:        raw.net_weight ? String(raw.net_weight) : "",
        grossWeight:      raw.gross_weight ? String(raw.gross_weight) : "",
        bardanaWeight:    raw.bardana_weight ? String(raw.bardana_weight) : "",
        noOfBags:         raw.no_of_bags ? String(raw.no_of_bags) : "",
        wtPerBag:         raw.weight_per_bags ? String(raw.weight_per_bags) : "",
        bardanaType:      raw.bardana_type || "",
        itemDesc:         raw.item_desc || "",
        igpNo:            raw.igp_no || "",
        freight:          raw.freight ? String(raw.freight) : "",
        remarks:          raw.remarks || "",
        vendor:           raw.vendor_name || "",
        slipInTime:       raw.slip_in_time || "",
        slipOutTime:      raw.slip_out_time || "",
        entryType:        raw.entry_type || "SALE",
        qualityDeduction: raw.quality_deduction ? String(raw.quality_deduction) : "",
        supplierWeight:   raw.supplier_weight ? String(raw.supplier_weight) : "",
        created_by_name:       raw.created_by_name || "",
        second_weight_by_name: raw.second_weight_by_name || "",
        second_weight_by:      raw.second_weight_by || "",
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching report data:", error);
    return null;
  }
};

const preparePrintWindow = (htmlContent: string, title: string) => {
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert("Please allow popups to print the report");
    return null;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          .print-btn-container { position: fixed; top: 10px; right: 10px; z-index: 9999; }
          .print-btn { padding: 10px 18px; font-size: 15px; font-weight: bold; cursor: pointer; }
          @media print { .print-btn-container { display: none; } }
        </style>
      </head>
      <body>
        <div class="print-btn-container">
          <button class="print-btn" onclick="window.print()">Print</button>
        </div>
        ${htmlContent}
      </body>
    </html>
  `);

  printWindow.document.close();
  return printWindow;
};


const handlePrintReport = async () => {
  if (!formData.slipNo) {
    alert("Please save the record first or load an existing slip to print");
    return;
  }

  if (!editingWbId || Number(editingWbId) === 0) {
    alert("❌ Please save the record first or load an existing slip to print");
    return;
  }

  const apiData = await fetchReportData(Number(editingWbId));

  if (!apiData) {
    alert("❌ Report data fetch nahi hua — please try again");
    return;
  }

  // ✅ DB se details lo — state se nahi
  const dbRows = (apiData.details || [])
    .filter((row: any) =>
      row.dc_no || row.do_no || row.customer_name ||
      row.item_code || row.item_desc || row.dc_qty
    )
    .map((row: any) => ({
      dcNo:            row.dc_no || "",
      doNo:            row.do_no || "",
      customerName:    row.customer_name || "",
      vehicleNo:       row.vehicle_no || "",
      itemCode:        row.item_code || "",
      itemDescription: row.item_desc || "",
      dcQty:           row.dc_qty ? String(row.dc_qty) : "",
      doQty:           row.do_qty ? String(row.do_qty) : "",
    }));

  const hasFirstWeight = apiData.first_weight && parseFloat(apiData.first_weight) > 0;
  const hasSecondWeight = apiData.second_weight && parseFloat(apiData.second_weight) > 0;

  const vehicleNo = apiData.vehicle_no || apiData.vehicleNo || "";

  // ✅ Dono weights → Weighbridge Report (Office + Customer copy)
  if (hasFirstWeight && hasSecondWeight) {
    const oldReportHTML = generateReportHTML(
      "second",
      apiData.slip_in_time || "",
      apiData.slip_out_time || "",
      vehicleNo,
      apiData,
      dbRows
    );
    preparePrintWindow(oldReportHTML, "Weighbridge Report");

  // ✅ Sirf first weight → Feeds Loading/Dispatch Order
  } else if (hasFirstWeight) {
    const newReportHTML = generateNewReportHTML(
      apiData.slip_in_time || "",
      null,
      vehicleNo,
      apiData,
      dbRows
    );
    preparePrintWindow(newReportHTML, "Feeds Dispatch Order");

  } else {
    alert("No weight data available to print.");
  }
};

// ✅ dbRows parameter add kiya
const generateReportHTML = (
  weightType: "first" | "second",
  slipInTime: string,
  slipOutTime: string | null,
  vehicleNo: string,
  apiData: any = null,
  dbRows: any[] = []   // ✅ NEW
) => {
  const currentDate = new Date()
    .toLocaleDateString("en-GB", { timeZone: "Asia/Karachi", day: "2-digit", month: "short", year: "2-digit" })
    .toUpperCase().replace(/\s/g, "-");

  const currentTime = new Date()
    .toLocaleTimeString("en-GB", { timeZone: "Asia/Karachi", hour12: true })
    .toUpperCase();

  function formatPKTDateTime(dateStr: string | Date): string {
    if (!dateStr) return "";
    const date = new Date(new Date(dateStr).toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
    const day = String(date.getDate()).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEPT","OCT","NOV","DEC"];
    const month = months[date.getMonth()];
    const time = date.toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }).toUpperCase();
    return `${day}-${month}-${year} ${time}`;
  }

  const formatFreightWithCommas = (value: string | number) => {
    if (!value) return "";
    const stringValue = value.toString();
    const cleanValue = stringValue.replace(/[^\d.]/g, "");
    const parts = cleanValue.split(".");
    let integerPart = parts[0];
    const decimalPart = parts[1];
    if (integerPart.length > 3) {
      const rightPart = integerPart.slice(-3);
      const leftPartFormatted = integerPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
      integerPart = leftPartFormatted + "," + rightPart;
    }
    return decimalPart !== undefined ? integerPart + "." + decimalPart : integerPart;
  };

  const weightByName = apiData?.created_by_name || "";
  const hasSecondWeight = apiData?.second_weight && parseFloat(apiData.second_weight) > 0;
  const hasSecondWeightById = !!(apiData?.second_weight_by);
  const secondWeightByName = (hasSecondWeight && hasSecondWeightById) ? (apiData?.second_weight_by_name || "") : "";

  const firstWeight  = apiData?.first_weight  ? String(apiData.first_weight)  : "";
  const secondWeight = apiData?.second_weight ? String(apiData.second_weight) : "";
  const netWeight    = apiData?.net_weight    ? String(apiData.net_weight)    : "";

  const firstImg  = `/captured_images/first_weight/slip_${apiData?.slip_no || ""}_${apiData?.entry_type || "sale"}.jpg`;
  const secondImg = `/captured_images/second_weight/slip_${apiData?.slip_no || ""}_${apiData?.entry_type || "sale"}.jpg`;

  const displaySlipInTime  = slipInTime  ? formatPKTDateTime(slipInTime)  : "";
  const displaySlipOutTime = slipOutTime ? formatPKTDateTime(slipOutTime) : "";

  // ✅ dbRows use karo — state nahi
  const grandTotal = dbRows.reduce((acc, row) => acc + (parseFloat(row.dcQty) || 0), 0);

  // ✅ Customer copy — DC wise grouping from dbRows
  const groupedByDC: { [key: string]: any[] } = {};
  dbRows.forEach(row => {
    const dcNo = row.dcNo || 'No DC';
    if (!groupedByDC[dcNo]) groupedByDC[dcNo] = [];
    groupedByDC[dcNo].push(row);
  });

  let customerCopyTablesHTML = '';
  Object.keys(groupedByDC).forEach(dcNo => {
    const rows = groupedByDC[dcNo];
    customerCopyTablesHTML += `
      <div style="margin-bottom: 20px; page-break-inside: avoid;">
        <table class="table">
          <thead>
            <tr><th>DC #</th><th>DO #</th><th>Party Name</th><th>Feed #</th><th>Feed Name</th><th>Qty</th></tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                <td>${row.dcNo || ""}</td>
                <td>${row.doNo || ""}</td>
                <td>${row.customerName || ""}</td>
                <td>${row.itemCode || ""}</td>
                <td>${row.itemDescription || ""}</td>
                <td>${row.dcQty || ""}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  });

  const officeCopyTableHTML = `
    <table class="table">
      <thead>
        <tr><th>DC #</th><th>DO #</th><th>Party Name</th><th>Feed #</th><th>Feed Name</th><th>Qty</th></tr>
      </thead>
      <tbody>
        ${dbRows.map(row => `
          <tr>
            <td>${row.dcNo || ""}</td>
            <td>${row.doNo || ""}</td>
            <td>${row.customerName || ""}</td>
            <td>${row.itemCode || ""}</td>
            <td>${row.itemDescription || ""}</td>
            <td>${row.dcQty || ""}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  const signaturesHTML = `
    <div class="signatures">
      <div class="signature-block">
        <div class="signature-container">
          <span class="signature-label">Weight By:</span>
          <span class="signature-line"><span class="signature-name">${weightByName}</span></span>
        </div>
      </div>
      <div class="signature-block">
        <div class="signature-container">
          <span class="signature-label">Second Weight By:</span>
          <span class="signature-line"><span class="signature-name">${secondWeightByName}</span></span>
        </div>
      </div>
      <div class="signature-block">
        <div class="signature-container">
          <span class="signature-label">Checked By:</span>
          <span class="signature-line"><span class="signature-name"></span></span>
        </div>
      </div>
       <div class="signature-block">
        <div class="signature-container">
          <span class="signature-label">Production Manager:</span>
          <span class="signature-line"><span class="signature-name"></span></span>
        </div>
      </div>
      
    </div>
  `;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Weighbridge Slip</title>
  <style>
    body { font-family:'Times New Roman', Times, serif; font-size: 20px; margin: 20px; }
    .container { border: 1px solid black; padding: 20px; height: auto; min-height: 1122px; box-sizing: border-box; }
    .title { text-align: center; font-weight: bold; margin-bottom: 6px; font-size: 22px; }
    .copy-label { text-align: left; font-weight: bold; margin-bottom: 4px; font-size: 16px; }
    .info-table { border-collapse: collapse; width: 100%; }
    .info-table td { border-bottom: 1px solid black; padding: 0px 0px; line-height: 1.0; }
    .print-date { text-align: right; font-size: 12px; font-weight: bold; }
    .label-cell { width: 20%; font-weight: bold; font-size: 14px; padding-left: 1px; }
    .value-cell { width: 40%; font-weight: bold; font-size: 18px; padding-right: 1px; }
    .slip-no-value { font-weight: 900; font-size: 20px !important; }
    .image-cell { width: 30%; border-left: 1px solid black; text-align: center; }
    .image-box-tall { height: 100%; display: flex; justify-content: center; align-items: center; border: 1px solid black; overflow: hidden; }
    .image-box-tall img { max-height: 100%; max-width: 100%; object-fit: contain; }
    .center-box { border: 1px solid black; text-align: center; font-weight: bold; width: 100%; height: 120px; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box; padding: 8px 10px; }
    .truck-label { font-weight: normal; font-size: 14px; border-bottom: 1px solid black; margin-bottom: 5px; padding-bottom: 2px; }
    .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .table th, .table td { border: 1px solid black; padding: 6px; text-align: left; font-size: 18px; font-weight: bold; }
    .signatures { display: flex; justify-content: space-between; margin-top: 40px; gap: 20px; }
    .signature-block { flex: 1; font-size: 14px; text-align: center; }
    .signature-label { display: inline-block; font-size: 14px; font-weight: bold; }
    .signature-line { display: inline-block; border-bottom: 1px solid black; width: 160px; position: relative; }
    .signature-name { font-size: 10px; font-weight: bold; color: #444; position: absolute; top: -18px; left: 50%; transform: translateX(-50%); white-space: nowrap; }
    .signature-container { display: flex; align-items: center; justify-content: center; gap: 3px; }
    .totals { display: flex; justify-content: space-between; margin-top: 10px; font-weight: bold; font-size: 16px; }
    .vehicle-no { font-weight: 900; font-size: 20px; }
    hr.dashed { border: 1px dashed #aaa; margin: 120px 0; }
  </style>
</head>
<body>
<div class="container">
  <div class="print-date">Print Date: ${currentDate} ${currentTime}</div>
  <div class="title">SABIRS FEEDS (PVT.) LTD.</div>
  <div class="copy-label">Office Copy</div>
  <div style="display: flex; justify-content: space-between; border: 1px solid black; border-left: 1px solid black;">
    <table class="info-table" style="width: 33.33%; border-right: 1px solid black;">
      <tr>
        <td class="label-cell">Slip No:</td>
        <td class="value-cell"><span class="slip-no-value">${apiData?.slip_no || ""}</span></td>
        <td class="image-cell" rowspan="3">
          <div class="image-box-tall">
            <img src="${firstImg}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
            <div style="display: none; font-size: 8px; color: #666;">No Img</div>
          </div>
        </td>
      </tr>
      <tr><td class="label-cell">Time In:</td><td class="value-cell">${displaySlipInTime}</td></tr>
      <tr><td class="label-cell">Time Out:</td><td class="value-cell">${displaySlipOutTime}</td></tr>
    </table>
    <div class="center-wrapper" style="width: 33.33%; display: flex; align-items: center; justify-content: center;">
      <div class="center-box">
        <div class="truck-label">Truck #</div>
       <span class="vehicle-no">${vehicleNo || apiData?.vehicle_no || apiData?.vehicleNo || ""}</span>
      </div>
    </div>
    <table class="info-table" style="width: 33.33%; border-right: 1px solid black;">
      <tr>
        <td class="label-cell">Tare Weight:</td>
        <td class="value-cell">${firstWeight ? parseFloat(firstWeight).toLocaleString("en-IN") : ""}</td>
        <td class="image-cell" rowspan="3">
          <div class="image-box-tall">
            <img src="${secondImg}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
            <div style="display: none; font-size: 8px; color: #666;">No Img</div>
          </div>
        </td>
      </tr>
      <tr><td class="label-cell">Loaded Weight:</td><td class="value-cell">${secondWeight ? parseFloat(secondWeight).toLocaleString("en-IN") : ""}</td></tr>
      <tr><td class="label-cell">Net Weight:</td><td class="value-cell">${netWeight ? parseFloat(netWeight).toLocaleString("en-IN") : ""}</td></tr>
    </table>
  </div>
  ${officeCopyTableHTML}
  <div class="totals">
    <div>Freight Payment: ${formatFreightWithCommas(apiData?.freight || "")}</div>
    <div>Grand Total: ${grandTotal.toLocaleString('en-IN')}</div>
  </div>
  ${signaturesHTML}
  <hr class="dashed" />
  <!-- CUSTOMER COPY -->
  <div class="print-date">Print Date: ${currentDate} ${currentTime}</div>
  <div class="title">SABIRS FEEDS (PVT.) LTD..</div>
  <div class="copy-label">Customer Copy</div>
  <div style="display: flex; justify-content: space-between; border: 1px solid black; border-left: 1px solid black;">
    <table class="info-table" style="width: 33.33%; border-right: 1px solid black;">
      <tr>
        <td class="label-cell">Slip No:</td>
        <td class="value-cell"><span class="slip-no-value">${apiData?.slip_no || ""}</span></td>
      </tr>
      <tr><td class="label-cell">Time In:</td><td class="value-cell">${displaySlipInTime}</td></tr>
      <tr><td class="label-cell">Time Out:</td><td class="value-cell">${displaySlipOutTime}</td></tr>
    </table>
    <div class="center-wrapper" style="width: 33.33%; display: flex; align-items: center; justify-content: center;">
      <div class="center-box">
        <div class="truck-label">Truck #</div>
        <span class="vehicle-no">${vehicleNo || apiData?.vehicle_no || "N/A"}</span>
      </div>
    </div>
    <table class="info-table" style="width: 33.33%; border-right: 1px solid black;">
      <tr><td class="label-cell">Tare Weight:</td><td class="value-cell">${firstWeight ? parseFloat(firstWeight).toLocaleString("en-IN") : ""}</td></tr>
      <tr><td class="label-cell">Loaded Weight:</td><td class="value-cell">${secondWeight ? parseFloat(secondWeight).toLocaleString("en-IN") : ""}</td></tr>
      <tr><td class="label-cell">Net Weight:</td><td class="value-cell">${netWeight ? parseFloat(netWeight).toLocaleString("en-IN") : ""}</td></tr>
    </table>
  </div>
  ${customerCopyTablesHTML}
  <div class="totals">
    <div>Freight Payment: ${formatFreightWithCommas(apiData?.freight || "")}</div>
    <div>Grand Total: ${grandTotal.toLocaleString('en-IN')}</div>
  </div>
  ${signaturesHTML}
</div>
</body>
</html>`;
};

// ---------------------------------------------------------------

// ✅ dbRows parameter add kiya
const generateNewReportHTML = (
  slipInTime: string,
  slipOutTime: string | null,
  vehicleNo: any,
  apiData: any = null,
  dbRows: any[] = []   // ✅ NEW
) => {
  const currentDate = new Date()
    .toLocaleDateString("en-GB", { timeZone: "Asia/Karachi", day: "2-digit", month: "short", year: "2-digit" })
    .toUpperCase().replace(/\s/g, "-");

  const currentTime = new Date()
    .toLocaleTimeString("en-GB", { timeZone: "Asia/Karachi", hour12: true })
    .toUpperCase();

  function formatPKTDateTime(dateStr: string | Date): string {
    if (!dateStr) return "";
    const date = new Date(new Date(dateStr).toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
    const day = String(date.getDate()).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEPT","OCT","NOV","DEC"];
    const month = months[date.getMonth()];
    const time = date.toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }).toUpperCase();
    return `${day}-${month}-${year} ${time}`;
  }

  const formatFreightWithCommas = (value: string | number) => {
    if (!value) return "";
    const stringValue = value.toString();
    const cleanValue = stringValue.replace(/[^\d.]/g, "");
    const parts = cleanValue.split(".");
    let integerPart = parts[0];
    const decimalPart = parts[1];
    if (integerPart.length > 3) {
      const rightPart = integerPart.slice(-3);
      const leftPartFormatted = integerPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
      integerPart = leftPartFormatted + "," + rightPart;
    }
    return decimalPart !== undefined ? integerPart + "." + decimalPart : integerPart;
  };

  const weightByName = apiData?.created_by_name || "";
  const hasSecondWeight = apiData?.second_weight && parseFloat(apiData.second_weight) > 0;
  const hasSecondWeightById = !!(apiData?.second_weight_by);
  const secondWeightByName = (hasSecondWeight && hasSecondWeightById) ? (apiData?.second_weight_by_name || "") : "";

  const firstWeight  = apiData?.first_weight  ? String(apiData.first_weight)  : "";
  const secondWeight = apiData?.second_weight ? String(apiData.second_weight) : "";
  const netWeight    = apiData?.net_weight    ? String(apiData.net_weight)    : "";

  const displaySlipInTime  = slipInTime  ? formatPKTDateTime(slipInTime)  : "";
  const displaySlipOutTime = slipOutTime ? formatPKTDateTime(slipOutTime) : "";

  // ✅ dbRows use karo — state nahi
  const grandTotal = dbRows.reduce((acc, row) => acc + (parseFloat(row.dcQty) || 0), 0);

  const signaturesHTML = `
    <div class="signatures">
      <div class="signature-block">
        <div class="signature-container">
          <span class="signature-label">Weight By:</span>
          <span class="signature-line"><span class="signature-name">${weightByName}</span></span>
        </div>
      </div>
    
      <div class="signature-block">
        <div class="signature-container">
          <span class="signature-label">Checked By:</span>
          <span class="signature-line"><span class="signature-name"></span></span>
        </div>
      </div>
      
    </div>
  `;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Feeds Loading Order</title>
  <style>
    body { font-family:'Times New Roman', Times, serif; font-size: 20px; margin: 20px; }
    .container { border: 1px solid black; padding: 20px; height: auto; min-height: 1122px; box-sizing: border-box; }
    .title { text-align: center; font-weight: bold; margin-bottom: 6px; font-size: 22px; }
    .copy-label { text-align: left; font-weight: bold; margin-bottom: 4px; font-size: 16px; }
    .info-table { border-collapse: collapse; width: 100%; }
    .info-table td { border-bottom: 1px solid black; padding: 0px 0px; line-height: 1.0; }
    .print-date { text-align: right; font-size: 12px; font-weight: bold; }
    .label-cell { width: 20%; font-weight: bold; font-size: 14px; padding-left: 1px; }
    .value-cell { width: 40%; font-weight: bold; font-size: 18px; padding-right: 1px; }
    .slip-no-value { font-weight: 900; font-size: 20px !important; }
    .center-box { border: 1px solid black; text-align: center; font-weight: bold; width: 100%; height: 120px; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box; padding: 8px 10px; }
    .truck-label { font-weight: normal; font-size: 14px; border-bottom: 1px solid black; margin-bottom: 5px; padding-bottom: 2px; }
    .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .table th, .table td { border: 1px solid black; padding: 6px; text-align: left; font-size: 18px; font-weight: bold; }
    .signatures { display: flex; justify-content: space-between; margin-top: 40px; gap: 20px; }
    .signature-block { flex: 1; font-size: 14px; text-align: center; }
    .signature-label { display: inline-block; font-size: 14px; font-weight: bold; }
    .signature-line { display: inline-block; border-bottom: 1px solid black; width: 160px; position: relative; }
    .signature-name { font-size: 10px; font-weight: bold; color: #444; position: absolute; top: -18px; left: 50%; transform: translateX(-50%); white-space: nowrap; }
    .signature-container { display: flex; align-items: center; justify-content: center; gap: 3px; }
    .totals { display: flex; justify-content: space-between; margin-top: 10px; font-weight: bold; font-size: 16px; }
    .vehicle-no { font-weight: 900; font-size: 20px; }
    hr.dashed { border: 1px dashed #aaa; margin: 120px 0; }
  </style>
</head>
<body>
<div class="container">
  <div class="print-date">Print Date: ${currentDate} ${currentTime}</div>
  <div class="title">SABIRS FEEDS (PVT.) LTD..</div>
  <div class="title">Feeds Loading Order</div>
  <div class="copy-label">Office Copy</div>
  <div style="display: flex; justify-content: space-between; border: 1px solid black; border-left: 1px solid black;">
    <table class="info-table" style="width: 33.33%; border-right: 1px solid black;">
      <tr>
        <td class="label-cell">Slip No:</td>
        <td class="value-cell"><span class="slip-no-value">${apiData?.slip_no || ""}</span></td>
      </tr>
      <tr><td class="label-cell">Time In:</td><td class="value-cell">${displaySlipInTime}</td></tr>
     
    </table>
    <div class="center-wrapper" style="width: 33.33%; display: flex; align-items: center; justify-content: center;">
      <div class="center-box">
        <div class="truck-label">Truck #</div>
        <span class="vehicle-no">${vehicleNo || apiData?.vehicle_no || "N/A"}</span>
      </div>
    </div>
    <table class="info-table" style="width: 33.33%; border-right: 1px solid black;">
      <tr><td class="label-cell">First Weight:</td><td class="value-cell">${firstWeight ? parseFloat(firstWeight).toLocaleString("en-IN") : ""}</td></tr>
     
    </table>
  </div>

  <table class="table">
    <thead>
      <tr><th>DC #</th><th>DO #</th><th>Party Name</th><th>Feed #</th><th>Feed Name</th><th>Qty</th></tr>
    </thead>
    <tbody>
      ${dbRows.map(row => `
        <tr>
          <td>${row.dcNo || ""}</td>
          <td>${row.doNo || ""}</td>
          <td>${row.customerName || ""}</td>
          <td>${row.itemCode || ""}</td>
          <td>${row.itemDescription || ""}</td>
          <td>${row.dcQty || ""}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="totals">
    <div>Freight Payment: ${formatFreightWithCommas(apiData?.freight || "")}</div>
    <div>Grand Total: ${grandTotal.toLocaleString('en-IN')}</div>
  </div>
  ${signaturesHTML}
  <hr class="dashed" />

  <!-- CUSTOMER COPY -->
  <div class="print-date">Print Date: ${currentDate} ${currentTime}</div>
  <div class="title">SABIRS FEEDS (PVT.) LTD..</div>
  <div class="title">Feeds Dispatch Order</div>
  <div class="copy-label">Customer Copy</div>
  <div style="display: flex; justify-content: space-between; border: 1px solid black; border-left: 1px solid black;">
    <table class="info-table" style="width: 33.33%; border-right: 1px solid black;">
      <tr>
        <td class="label-cell">Slip No:</td>
        <td class="value-cell"><span class="slip-no-value">${apiData?.slip_no || ""}</span></td>
      </tr>
      <tr><td class="label-cell">Time In:</td><td class="value-cell">${displaySlipInTime}</td></tr>
     
    </table>
    <div class="center-wrapper" style="width: 33.33%; display: flex; align-items: center; justify-content: center;">
      <div class="center-box">
        <div class="truck-label">Truck #</div>
        <span class="vehicle-no">${vehicleNo || apiData?.vehicle_no || "N/A"}</span>
      </div>
    </div>
    <table class="info-table" style="width: 33.33%; border-right: 1px solid black;">
      <tr><td class="label-cell">First Weight:</td><td class="value-cell">${firstWeight ? parseFloat(firstWeight).toLocaleString("en-IN") : ""}</td></tr>
     
    </table>
  </div>

  <table class="table">
    <thead>
      <tr><th>DC #</th><th>DO #</th><th>Party Name</th><th>Feed #</th><th>Feed Name</th><th>Qty</th></tr>
    </thead>
    <tbody>
      ${dbRows.map(row => `
        <tr>
          <td>${row.dcNo || ""}</td>
          <td>${row.doNo || ""}</td>
          <td>${row.customerName || ""}</td>
          <td>${row.itemCode || ""}</td>
          <td>${row.itemDescription || ""}</td>
          <td>${row.dcQty || ""}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="totals">
    <div>Freight Payment: ${formatFreightWithCommas(apiData?.freight || "")}</div>
    <div>Grand Total: ${grandTotal.toLocaleString('en-IN')}</div>
  </div>
  ${signaturesHTML}
</div>
</body>
</html>`;
};




// ------------------------------------------------------------------





const handleSalesDataChange = (
  index: number,
  field: string | string[],
  value: any | any[]
) => {
  setSalesData(prev => {
    const newData = [...prev];
    const updatedRow = { ...newData[index] };

    if (Array.isArray(field) && Array.isArray(value)) {
      field.forEach((f, i) => {
        updatedRow[f] = value[i];
      });
    } else if (typeof field === "string") {
      updatedRow[field] = value;
    }

    newData[index] = updatedRow;
    return newData;
  });
};


const handleReject = async (wbId: number) => {
  if (!wbId) return;

  try {
    const response = await fetch(`/api/purchases/reject/${wbId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errorData = await response.json();
      alert(`Failed to reject: ${errorData.message}`);
      return;
    }

    alert("Entry rejected successfully!");

    // ⚡ Remove rejected record using wb_id
    const queryKey = ["/api/purchase/first-weight-records"];

    queryClient.setQueryData(queryKey, (oldData: any[] = []) =>
      oldData.filter(record => record.wb_id !== wbId)
    );

    // Reset Form
    setFormData(prev => ({
      ...prev,
      wbId: "",
      slipNo: "",
      slipInTime: "",
      slipOutTime: "",
      slipDate: "",
      status: "",
      entryType: "",
      firstWeight: "",
      secondWeight: "",
      netWeight: "",
      bardanaWeight: "",
      grossWeight: "",
      freight: "",
      remarks: "",
      driverName: "",
      companyId: "",
      branchId: "",
      onlineEntry: "",
      offlineEntry: "",
      createdBy: "",
      creationDate: "",
      lastUpdatedBy: "",
      lastUpdatedDate: "",
      manualDcNo: "",
      isPercentageMode: false,
    }));

    window.location.reload();

  } catch (error) {
    console.error("Error rejecting entry:", error);
    alert("Error rejecting entry. Check console.");
  }
};


const handleSalesRowDelete = (index: number) => {
  // Get the freight value of the row being deleted
  const deletedFreight = parseFloat(salesData[index]?.freight?.toString() || "0") || 0;
  
  setSalesData((prevData) => {
    const newData = [...prevData];
    // Clear the row data
    newData[index] = {
      doId: "",
      dcNo: "",
      doNo: "",
      customerName: "",
      vehicleNo: "",
      doDate: "",
      itemDescription: "",
      dcQty: "",
      doQty: "",
      branch: "",
      dcId: "",
      customerId: "",
      itemId: "",
      itemCode: "",
      freight: "",
    };
    return newData;
  });
  
  // Update the master freight total by subtracting the deleted row's freight
  if (deletedFreight > 0) {
    setFormData(prev => {
      const currentFreight = parseFloat(prev.freight || "0") || 0;
      const newFreightTotal = Math.max(0, currentFreight - deletedFreight);
      
      return {
        ...prev,
        freight: String(newFreightTotal)
      };
    });
  }
};




  // const handleSalesRowDelete = (index: number) => {
    
  //   setSalesData((prevData) => {
  //     const newData = [...prevData];
  //     // Clear the row data
  //     newData[index] = {
  //       doId: "",
  //       dcNo: "",
  //       doNo: "",
  //       customerName: "",
  //       vehicleNo: "",
  //       doDate: "",
  //       itemDescription: "",
  //       dcQty: "",
  //       doQty: "",
  //       branch: "",
  //       dcId: "",
  //       customerId: "",
  //       itemId: "",
  //       itemCode: "",
  //       freight: "",
  //     };
  //     return newData;
  //   });
  // };


  
  const { comPort } = useComPort();

  // ===== HIGHLY OPTIMIZED DATA FETCHING - MAXIMUM PERFORMANCE =====
  // Fetch first weight records with aggressive caching for performance
  const { data: firstWeightRecords = [] } = useQuery({
    queryKey: ["/api/purchase/first-weight-records"],
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // Don't refetch on network reconnect
  });

  // Fetch offline records with aggressive caching
  const { data: offlineRecords = [] } = useQuery({
    queryKey: ["/api/purchases/offline"],
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // State for showing offline entries
  const [showOfflineEntries, setShowOfflineEntries] = useState(false);

  // Filter records based on search criteria and form type
  const filteredRecords = (() => {
    let records = [];

    if (showOfflineEntries) {
      // Show offline records when offline tab is selected
      records = Array.isArray(offlineRecords) ? offlineRecords : [];
    } else {
      // Show all first weight records for other tabs
      records = Array.isArray(firstWeightRecords) ? firstWeightRecords : [];
    }

    return records.filter((record: any) => {
      const matchesSlipNo =
        !searchSlipNo ||
        (record.slip_no || "")
          .toString()
          .toLowerCase()
          .includes(searchSlipNo.toLowerCase());
      const matchesVehicleNo =
        !searchVehicleNo ||
        (record.vehicle_no || "")
          .toString()
          .toLowerCase()
          .includes(searchVehicleNo.toLowerCase());
      return matchesSlipNo && matchesVehicleNo;
    });
  })();

  // Function to load data by wb_id for editing
  const loadDataByWbId = async (wbId: number) => {
    try {
      console.log("loadDataByWbId called with wbId:", wbId);
      const response = await fetch(`/api/sales/by-wbid/${wbId}`);
      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);
      if (data && data.master) {
        const master = data.master;
        const details =
          data.details && data.details.length > 0 ? data.details[0] : {};

        // Enable edit mode
        setIsEditMode(true);
        setEditingWbId(master.wb_id);
        console.log("✅ Edit mode enabled for wb_id:", master.wb_id);

        // Load all the form data including detail table data
        setFormData((prev) => ({
          ...prev,
          slipNo: master.slip_no || "",
          vehicleNo:
            master.entry_type === "OFFLINE"
              ? details.vehicle_no || ""
              : master.vehicle_no || details.vehicle_no || "",
          firstWeight: master.first_weight ? String(master.first_weight) : "",
          secondWeight: master.second_weight
            ? String(master.second_weight)
            : "",
          netWeight: master.net_weight ? String(master.net_weight) : "",
          bardanaWeight: master.bardana_weight
            ? String(master.bardana_weight)
            : "",
          grossWeight: master.gross_weight ? String(master.gross_weight) : "",
          freight: master.freight ? String(master.freight) : "",
          remarks: master.remarks || "",
          driverName: master.driver_name || "",
          // Detail table data


           // ✅ ADD THESE FIELDS - Weight by names (for edit mode)
          created_by_name: master.created_by_name || "",
          second_weight_by_name: master.second_weight_by_name || master.created_by_name || "",
          second_weight_by: master.second_weight_by || "",


          vendor: details.vendor_name || "",
          igpNo: details.igp_no || "",
          poNo: details.po_no || "",

          itemCode: details.item_code || "",
          itemDesc: details.item_desc || "",
          poQty: details.po_qty ? String(details.po_qty) : "",
          igpQty: details.igp_qty ? String(details.igp_qty) : "",
          balanceQty: details.balance_qty ? String(details.balance_qty) : "",
          bardanaType: details.bardana_type || "",
          wtPerBag: details.weight_per_bags
            ? String(details.weight_per_bags)
            : "",
                      freightChild: details.freight_child || "",

          noOfBags: details.no_of_bags ? String(details.no_of_bags) : "",
          igpDate: details.igp_date || "",
          slipInTime: master.slip_in_time
            ? formatDatetimeLocal(master.slip_in_time)
            : "",
          slipOutTime: master.slip_out_time
            ? formatDatetimeLocal(master.slip_out_time)
            : "",
          entryType: master.entry_type || "SALE",
          branch: master.branch_id ? String(master.branch_id) : "",
          branchId: master.branch_id ? String(master.branch_id) : "",
                                    // ✅ NEW FIELDS FOR BUTTON DISABLE LOGIC
  isFirstWeightSaved: !!master.first_weight,   // true if first weight exists in DB
  isSecondWeightSaved: !!master.second_weight, // true if second weight exists in DB
        }));



                  // 🔥 Set Save Disable Condition
setDisableSaveButton(
  master.status === "ONLINE" &&     // ⬅️ status check yahan
  !!master.first_weight &&
  !!master.second_weight
);
        // Set online/offline status based on database values - prioritize offline_entry
        console.log(
          "Database entry mode - offline_entry:",
          master.offline_entry,
          "online_entry:",
          master.online_entry
        );

        if (master.offline_entry === "Yes") {
          console.log("Setting offline mode for sale entry");
          setOnlineMode(false);

          // Update URL to reflect offline mode
          const urlParams = new URLSearchParams(window.location.search);
          urlParams.set("type", "offline");
          const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
          window.history.replaceState({}, "", newUrl);
        } else if (master.online_entry === "Yes") {
          console.log("Setting online mode for sale entry");
          setOnlineMode(true);

          // Update URL to reflect online mode
          const urlParams = new URLSearchParams(window.location.search);
          urlParams.set("type", "online");
          const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
          window.history.replaceState({}, "", newUrl);
        }

        // Load sales data from details - check for both SALE and if we have detail data
        if (data.details && data.details.length > 0) {
          const salesRows = data.details.map((detail: any, index: number) => {
            // Find branch name from branches array using master's branch_id
            const branchName =
              branches.find((b) => b.branch_id === master.branch_id)
                ?.branch_name || "";

            return {
              doId: String(index + 1),
                       wb_item_p_id: detail.wb_item_p_id || null,
              dcNo: detail.manual_dc_no || detail.igp_no || "", // Depending on source
              doNo: detail.do_no || detail.po_no || "", // Try both fields
              customerName: detail.customer_name || detail.vendor_name || "",
              vehicleNo: detail.vehicle_no || "",
              doDate: detail.do_date || detail.igp_date || "", // May be null
              itemDescription: detail.item_desc || "",
              dcQty: detail.dc_qty
                ? String(detail.dc_qty)
                : detail.igp_qty
                ? String(detail.igp_qty)
                : "",
              doQty: detail.do_qty
                ? String(detail.do_qty)
                : detail.po_qty
                ? String(detail.po_qty)
                : "",
              branch: branchName,
              // Hidden / internal fields
              dcId: detail.dc_id || "", // if applicable
              customerId: detail.customer_id || "",
              itemId: detail.item_id || "",
              itemCode: detail.item_code || "",
               remarks: detail.remarks || "",
            };
          });

          // Ensure 8 rows
          while (salesRows.length < 8) {
            salesRows.push({
                wb_item_p_id: null,
              doId: "",
              dcId: "",
              dcNo: "",
              doNo: "",
              customerName: "",
              vehicleNo: "",
              doDate: "",
              itemDescription: "",
              dcQty: "",
              doQty: "",
              branch: "",
              customerId: "",
              itemId: "",
              itemCode: "",
            });
          }

          setSalesData(salesRows);
          console.log("✅ Sales data loaded in edit mode:", salesRows);

          
        // 🔹 Update details state for customer LOV
        const detailsRows = salesRows.map((row: any) => ({
          customerName: row.customerName || "",
          customerId: row.customerId || "",
        }));
        setdetails(detailsRows);
        console.log("✅ Details for customer LOV updated:", detailsRows);


        } else {
          // No detail data found, reset to empty table
          setSalesData(
            Array.from({ length: 8 }, (_, index) => ({
              doId: "",
              dcNo: "",
              doNo: "",
              customerName: "",
              vehicleNo: "",
              doDate: "",
              itemDescription: "",
              dcQty: "",
              doQty: "",
              branch: "",
              dcId: "",
              customerId: "",
              itemId: "",
              itemCode: "",
            }))
          );
          console.log("No sales detail data found, using empty table");
        }
      }
    } catch (error) {
      console.error("Error loading data by wb_id:", error);
      alert("Failed to load record data");
    }
  };

  // // Function to get current date in YYYY-MM-DD format
  // const getCurrentDate = () => {
  //   const today = new Date();
  //   return today.toISOString().split("T")[0];
  // };

  const initialFormData = {
  // Basic slip information
  slipNo: "",
  slipInTime: "",
  slipOutTime: "",
  slipDate: "",
  status: "",
  entryType: "SALE",

  // Weight measurements
  firstWeight: "",
  secondWeight: "",
  netWeight: "",
  bardanaWeight: "",
  grossWeight: "",
  supplierWeight: "",
  supplierWeightMinusBardana: "",
  supplierWeightMinusOutWeight: "",
  qualityDeduction: "",

  // Vehicle and driver information
  vehicleNo: "",
  driverName: "",

  // IGP and purchase details
  igpNo: "",
  igpDate: "",
  poNo: "",
  po_no: "",
  itemCode: "",
  itemDesc: "",
  poQty: "",
  igpQty: "",
  balanceQty: "",

  // Bardana information
  bardanaType: "",
  wtPerBag: "",
  noOfBags: "",
  bagCondition: "",
  bardanaTypeId: "",

  // Vendor information
  vendor: "",
  vendorName: "",
  customerId: "",
  customerName: "",
created_by_name: "",        // ✅ Add this
  second_weight_by_name: "",  // ✅ Add this
  second_weight_by: "",       // ✅ Add this
  // System fields
  wbId: "",
  companyId: "",
  branchId: "",
  branch: "",
  onlineEntry: "Yes",
  offlineEntry: "",
  createdBy: "",
  creationDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
  manualDcNo: "",

  // Additional fields
  doId: "",
  doNo: "",
  doDate: "",
  freight: "",
  freightChild: "", // ✅ add this, default 0
  remarks: "",

  // Missing fields that are referenced in the code
  qualityDed: "",
  weight: "",
  bags: "",
  wbItemPId: "",
  itemId: "",
  poId: "",
  baradanaType: "",
  manualIgpNo: "",
  igpId: "",
  totalFeedBags: "",
  vendorId: "",
  weightPerBags: "",
  dcQty: "",
  supWeightWithoutBardana: "",
  netSupplierWeight: "",
  isPercentageMode: false,
  isFirstWeightSaved: false,  // ✅ first weight DB me saved hai ya nahi
  isSecondWeightSaved: false, // ✅ second weight DB me saved hai ya nahi
};


  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingWbId, setEditingWbId] = useState<number | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);

  const [onlineMode, setOnlineMode] = useState(() => {
    // Initialize based on URL parameter immediately
    const urlParams = new URLSearchParams(window.location.search);
    const typeMode = urlParams.get("type");
    console.log("Initial state calculation - typeMode:", typeMode);
    if (typeMode === "offline") {
      console.log("Setting initial state to OFFLINE");
      return false;
    } else if (typeMode === "online") {
      console.log("Setting initial state to ONLINE");
      return true;
    }
    // Default to online if no parameter specified
    console.log("No type parameter, defaulting to ONLINE");
    return true;
  });
  const [plateReading, setPlateReading] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [entryTypes, setEntryTypes] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [itemSearchQuery, setItemSearchQuery] = useState("");
const [selectedBranch, setSelectedBranch] = useState<number | null>(null);


const filteredCustomers = useMemo(() => {
  if (!customers || customers.length === 0) {
    //console.log("❌ No customers available");
    return [];
  }

  const query = customerSearchQuery.trim().toLowerCase();
  console.log("🔍 Search query:", query);
  console.log("📊 Total customers:", customers.length);

  if (!query || query === "") {
    console.log("✅ Showing first 5 customers");
    return customers.slice(0, 5);
  }

  // Fast case-insensitive search with early termination
  const matches = [];
  for (let i = 0; i < customers.length && matches.length < 50; i++) {
    const customer = customers[i];
    
    // 🔥 FIX: Check BOTH name AND customer_name
    const customerNameLower = (
      customer.name || 
      customer.customer_name || 
      customer.full_name ||
      ""
    ).toLowerCase();
    
    console.log(`Customer ${i}:`, customerNameLower, "includes?", query, customerNameLower.includes(query));
    
    if (customerNameLower.includes(query)) {
      console.log("✅ MATCH found!");
      matches.push(customer);
    }
  }

  console.log(`✅ Found ${matches.length} matching customers`);
  return matches;
}, [customers, customerSearchQuery]);






  // Optimized filtered items with better case-insensitive performance
  const filteredItems = useMemo(() => {
    if (!items || items.length === 0) return [];

    const query = itemSearchQuery.trim().toLowerCase();

    if (!query) {
      // Show only first 5 items when no search query
      return items.slice(0, 5);
    }

    // Fast case-insensitive search with early termination
    const matches = [];
    for (let i = 0; i < items.length && matches.length < 50; i++) {
      const item = items[i];
      const itemCodeLower = (item.code || "").toLowerCase();
      const itemDescLower = (item.description || "").toLowerCase();

      if (itemCodeLower.includes(query) || itemDescLower.includes(query)) {
        matches.push(item);
      }
    }

    return matches;
  }, [items, itemSearchQuery]);
  const { cameraIp, cameraPort } = useConfig();

  useEffect(() => {
  const firstWeight = parseFloat(formData.firstWeight) || 0;
  const secondWeight = parseFloat(formData.secondWeight) || 0;
  const wtPerBag = parseFloat(formData.wtPerBag) || 0;
  const noOfBags = parseFloat(formData.noOfBags) || 0;

  const bardanaWeight = wtPerBag * noOfBags;

  // ✔️ Your actual formula (negative allowed)
  const grossWeight = secondWeight - firstWeight;

  const netWeight = grossWeight - bardanaWeight;

 setFormData((prev) => ({
  ...prev,
  bardanaWeight: Math.round(bardanaWeight).toString(),
  grossWeight: Math.round(grossWeight).toString(),
  netWeight: Math.round(netWeight).toString(),
}));
}, [
  formData.firstWeight,
  formData.secondWeight,
  formData.wtPerBag,
  formData.noOfBags,
]);


useEffect(() => {
  // calculate total DC Qty from salesData
  const totalDcQty = salesData.reduce(
    (sum, row) => sum + (parseFloat(row.dcQty) || 0),
    0
  );

  const netWeight = parseFloat(formData.netWeight);

  if (!isNaN(netWeight) && totalDcQty > 0) {
    setFormData(prev => ({
      ...prev,
      weightPerBags: (netWeight / totalDcQty).toFixed(2),
    }));
  } else {
    setFormData(prev => ({
      ...prev,
      weightPerBags: "",
    }));
  }
}, [formData.netWeight, salesData]); // salesData change hone par bhi recalc




 // Calculate Total Weight Diff
const totalWeightDiff = useMemo(() => {
  const netWeight = parseFloat(formData.netWeight) || 0;

  // 🔹 Sum of all DC Qty in table
  const totalDcQty = salesData.reduce(
    (sum, row) => sum + (parseFloat(row.dcQty) || 0),
    0
  );

  // 🔹 Formula: (dcQty * 50) - netWeight
  return netWeight - (totalDcQty * 50)  ;

}, [formData.netWeight, salesData]);



// // Calculate Total Weight Diff
// const totalWeightDiff = useMemo(() => {
//    const firstWeight = parseFloat(formData.firstWeight) || 0;
//    const secondWeight = parseFloat(formData.secondWeight) || 0;

//   // 🔹 Sum of all DC Qty in table
//   const totalDcQty = salesData.reduce(
//     (sum, row) => sum + (parseFloat(row.dcQty) || 0),
//     0
//   );

//   // 🔹 Formula: (dcQty * 50) - netWeight
//   return firstWeight + (totalDcQty * 50) - secondWeight;

// }, [formData.netWeight, salesData]);




  
  interface SalesRow {
  doId: string;
  dcNo: string;
  doNo: string;
  customerName: string;
  vehicleNo: string;
  doDate: string;
  itemDescription: string;
  dcQty: string;
  doQty: string;
  branch: string;
  branchId?: string | number;
  dcId?: string;
  customerId?: number | null;
  itemId?: string;
  itemCode?: string;
 remarks: string;
    // ✅ Add this
  freight?: string | number;
    isFetched?: boolean;
}


// --------------------------------------
const fetchDcData = async (dcNo: string, rowIndex: number) => {
  if (!dcNo || dcNo.trim() === "") {
    alert("Please enter DC No");
    return;
  }

  // ✅ Check if branch is selected (branchId for DB)
  if (!formData.branchId) {
    alert("Please select a branch first");
    return;
  }

  try {
    // ✅ API call with branch ID (for backend filtering)
    const apiUrl = `http://portal.sabirsgroup.com:8184/ords/sabroso_ords/wb-sf/dc_data?dc_no=${dcNo}&branch=${formData.branchId}`;
    console.log("Fetching URL with Branch ID:", apiUrl);

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("DC API Response:", data);

    if (data?.items?.length > 0) {
      
      // ✅ Get branch NAME from branches array using branchId
      const selectedBranch = branches.find(
        (b) => b.branch_id.toString() === formData.branchId?.toString()
      );
      
      const branchName = selectedBranch?.branch_name || "";
      const branchIdForDB = formData.branchId; // This is for DB

      console.log("Branch Name for display:", branchName);
      console.log("Branch ID for DB:", branchIdForDB);

      // Prepare new entries for salesData
      const newEntries: SalesRow[] = data.items.map((item: any) => {
        const freightValue = parseFloat(item.freight || item.freight_amount || "0");
        
        return {
          doId: item.do_id || "",
          dcNo: item.dc_no || "",
          doNo: item.delivery_order_no ? String(item.delivery_order_no) : "",
          customerName: item.customer_name || "",
          vehicleNo: item.vehicle_no || "",
          doDate: item.dc_date
            ? new Date(item.dc_date).toISOString().split("T")[0]
            : "",
          itemDescription: item.item_desc || "",
          dcQty: item.dc_qty ? String(item.dc_qty) : "",
          doQty: item.del_qty ? String(item.del_qty) : "",
          branch: branchName,           // ✅ Branch NAME for display (frontend)
          branchId: branchIdForDB,      // ✅ Branch ID for DB (backend)
          dcId: item.dc_id || "",
          customerId: item.customer_id != null ? Number(item.customer_id) : null,
          itemId: item.item_id || "",
          itemCode: item.item_code || "",
          freight: freightValue,
          remarks: item.remarks || "",  // ✅ ADDED: Remarks from DC API
          isFetched: true
        };
      });

      // Prepare details entries
      const newDetailsEntries = data.items.map((item: any) => {
        const freightValue = parseFloat(item.freight || item.freight_amount || "0");
        
        return {
          customerName: item.customer_name || "",
          customerId: item.customer_id != null ? Number(item.customer_id) : null,
          itemCode: item.item_code || "",
          itemDescription: item.item_desc || "",
          dcQty: item.dc_qty ? String(item.dc_qty) : "",
          doQty: item.del_qty ? String(item.del_qty) : "",
          uom: "",
          rate: "",
          amount: "",
          doId: item.do_id || "",
          doNo: item.delivery_order_no ? String(item.delivery_order_no) : "",
          vehicleNo: item.vehicle_no || "",
          doDate: item.dc_date
            ? new Date(item.dc_date).toISOString().split("T")[0]
            : "",
          dcId: item.dc_id || "",
          itemId: item.item_id || "",
          branchId: branchIdForDB,      // ✅ Branch ID for DB
          dcNo: item.dc_no || "",
          branch: branchName,           // ✅ Branch NAME for display
          freight: freightValue,
          remarks: item.remarks || "",  // ✅ ADDED: Remarks from DC API
        };
      });

      // Update sales data array
      setSalesData((prev: SalesRow[]) => {
        const updated = [...prev];
        newEntries.forEach((entry, index) => {
          updated[rowIndex + index] = entry;
        });
        return updated;
      });

      // Update details array
      setdetails((prev) => {
        const updated = [...prev];
        newDetailsEntries.forEach((entry: any, index: any) => {
          updated[rowIndex + index] = {
            ...updated[rowIndex + index],
            customerName: entry.customerName,
            customerId: entry.customerId,
            itemCode: entry.itemCode,
            itemDescription: entry.itemDescription,
            dcQty: entry.dcQty,
            doQty: entry.doQty,
            doId: entry.doId,
            doNo: entry.doNo,
            vehicleNo: entry.vehicleNo,
            doDate: entry.doDate,
            dcId: entry.dcId,
            itemId: entry.itemId,
            branchId: entry.branchId,   // ✅ Branch ID for DB
            dcNo: entry.dcNo,
            branch: entry.branch,        // ✅ Branch NAME for display
            freight: entry.freight,
            remarks: entry.remarks,      // ✅ ADDED: Remarks saved in details
          };
        });
        return updated;
      });

      // Calculate TOTAL freight
      const totalFreightFromDC =
        parseFloat(data.items?.[0]?.freight || data.items?.[0]?.freight_amount || "0") || 0;

      // Update master freight
      setFormData((prev) => {
        const currentFreight = parseFloat(prev.freight || "0") || 0;
        const newTotalFreight = totalFreightFromDC;
        
        return {
          ...prev,
          dcQty: newEntries[0]?.dcQty || prev.dcQty,
          netWeight: prev.netWeight || "",
          freight: String(newTotalFreight)
        };
      });

      saveFreightToLocalStorage(dcNo, totalFreightFromDC);

    } else {
      alert(`No data found for DC No: ${dcNo}`);
    }
  } catch (error) {
    console.error("Error fetching DC data:", error);
    alert("Failed to fetch DC data. Please check the DC number and try again.");
  }
};






// 🔹 Helper function to save freight to localStorage
const saveFreightToLocalStorage = (dcNo: string, freight: number) => {
  try {
    const savedFreightData = JSON.parse(localStorage.getItem('dcFreightData') || '{}');
    savedFreightData[dcNo] = freight;
    localStorage.setItem('dcFreightData', JSON.stringify(savedFreightData));
  } catch (error) {
    console.error("Error saving freight to localStorage:", error);
  }
};

// 🔹 Function to load saved freight from localStorage (call on component mount)
const loadSavedFreight = () => {
  try {
    const savedFreightData = JSON.parse(localStorage.getItem('dcFreightData') || '{}');
    const totalFreight = Object.values(savedFreightData).reduce((sum: number, val: any) => {
      return sum + (parseFloat(val) || 0);
    }, 0);
    
    setFormData(prev => ({
      ...prev,
      freight: String(totalFreight)
    }));
  } catch (error) {
    console.error("Error loading saved freight:", error);
  }
};


// --------------------------------------------


  // Function to search and load data by slip number
  const searchAndLoadBySlipNo = async () => {
    if (!formData.slipNo || formData.slipNo.trim() === "") {
      alert("Please enter a slip number to search");
      return;
    }

    try {
      setLoading(true);
      console.log("Searching for slip:", formData.slipNo);

      // Search with entry type filtering to only find sale-related entries
      const response = await fetch(
        `/api/sales/by-slip/${formData.slipNo.trim()}?entry_type=SALE`
      );

      if (!response.ok) {
        alert(`No SALE record found for slip number ${formData.slipNo}`);
        setLoading(false);
        return;
      }

      const data = await response.json();
      if (data && data.master) {
        const master = data.master;
        const entryType = master.entry_type;
        const isOffline = master.offline_entry === "Yes";

        console.log(
          "Found SALE record - Entry Type:",
          entryType,
          "Offline:",
          isOffline
        );

        // Check if this is a sale-related entry that can be edited in sales form
        if (entryType === "SALE" || entryType === "SALE_RETURN") {
          // Update online/offline status based on the found record
          setOnlineMode(!isOffline);

          // Determine the correct URL based on entry type and online/offline status
          const modeParam = isOffline ? "offline" : "online";

          if (entryType === "SALE_RETURN") {
            const targetUrl = `/sales-return?type=${modeParam}&edit=${master.wb_id}`;
            console.log(
              `Found ${entryType} entry (${
                isOffline ? "Offline" : "Online"
              }), redirecting to:`,
              targetUrl
            );
            setLocation(targetUrl);
          } else {
            // For SALE entries, stay on current page and load the data
            await loadDataByWbId(master.wb_id);

            // Update URL to show edit mode with correct type
            const newUrl = `/sales-form?type=${modeParam}&edit=${master.wb_id}`;
            window.history.replaceState({}, "", newUrl);

            // Exit search mode
            setIsSearchMode(false);
            setLoading(false);
            return;
          }
        } else {
          alert(
            `Found ${entryType} entry for slip ${formData.slipNo}, but this is the Sales form. Please use the appropriate form for ${entryType} entries.`
          );
        }
      } else {
        alert("Invalid record data found");
      }
    } catch (error) {
      console.error("Error searching for slip:", error);
      alert("Failed to search for slip number");
    } finally {
      setLoading(false);
    }
  };

  // Function to cancel edit mode and return to new entry mode
  const cancelEdit = () => {
    setIsEditMode(false);
    setEditingWbId(null);
    resetFormToInitial();
  };

  useEffect(() => {
    if (branches.length > 0 && !isEditMode && !formData.branchId) {
      const defaultBranch = branches[0]; // first branch
      setFormData((prev) => ({
        ...prev,
        branchId: defaultBranch.branch_id.toString(),
        branch: defaultBranch.branch_name,
      }));
    }
  }, [branches, isEditMode, formData.branchId]);

  //vehicle no in offline entry auto generate slip
  useEffect(() => {
    if (formData.offlineEntry === "Yes") {
      const firstVehicleNo = salesData
        .find((row) => row.vehicleNo?.trim())
        ?.vehicleNo?.trim();
      if (firstVehicleNo) {
        setFormData((prev) => ({
          ...prev,
          vehicleNo: firstVehicleNo,
        }));
      }
    }
  }, [salesData, formData.offlineEntry]);

  // Function to reset form to clean state
  const resetFormToInitial = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const typeMode = urlParams.get("type");
    const isOfflineMode = typeMode === "offline";

    // Sync onlineMode state with URL parameter
    setOnlineMode(typeMode === "online");

    // 🔹 Step 1: Immediately blank reset (master form)
    setFormData({
      ...initialFormData,
      slipNo: "", // temporary blank, API se update hoga
      slipInTime: "",
      onlineEntry: isOfflineMode ? "No" : "Yes",
      offlineEntry: isOfflineMode ? "Yes" : "No",
      entryType: "SALE",
      creationDate: getPKTDateTime(),
      lastUpdatedDate: getPKTDateTime(),
      slipDate: getPKTDateTime(),
      createdBy: user?.userid || "",
      vehicleNo: "",
        netWeight: formData.netWeight,  // preserve
  dcQty: formData.dcQty,          // preserve
    });

    // 🔹 Step 2: Exit edit mode immediately
    setIsEditMode(false);
    setEditingWbId(null);

    // 🔹 Step 3: Reset sales data table (always reset)
    setSalesData(
      Array.from({ length: 8 }, () => ({
        doId: "",
        dcNo: "",
        doNo: "",
        customerName: "",
        vehicleNo: "",
        doDate: "",
        itemDescription: "",
        dcQty: "",
        doQty: "",
        branch: "",
      }))
    );

    // 🔹 🔥 Step 3.1: RESET DETAILS (THIS WAS MISSING)
setdetails(
  Array.from({ length: 8 }, () => ({
    customerName: "",
    customerId: null,
  }))
);

// 🔹 Also reset LOV-related flags
setIsCustomerSelected(false);
setOpenCustomerLovRowIndex(null);
setFocusedCustomerRowIndex(null);
setCustomerSearchQuery("");
setHighlightedCustomerIndex(-1);

    // 🔹 Step 4: Fetch next slip number asynchronously
    fetch("/api/purchases/next-slip?entry_type=SALE")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch next slip number");
        return res.json();
      })
      .then((data) => {
        setFormData((prev) => ({
          ...prev,
          slipNo: data.nextSlipNo,
          vehicleNo: isOfflineMode ? salesData[0]?.vehicleNo || "" : "",
        }));
      })
      .catch((err) => {
        console.error("Error fetching next slip number:", err);
        alert("Failed to fetch next slip number. Please try again.");
      });
  };

  // Get camera data
  const { data: camera } = useQuery({
    queryKey: ["/api/cameras/1"],
    enabled: true,
  });

  const formatDatetimeLocal = useCallback((raw: any) => {
    if (!raw && raw !== 0) return "-";

    // normalize to string
    let s = String(raw).trim();

    // If DB gives "YYYY-MM-DD HH:MM:SS" -> turn into ISO "YYYY-MM-DDTHH:MM:SS"
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(s)) {
      s = s.replace(/\s+/, "T");
    }

    // If DB gives "YYYY-MM-DD" only, keep as is (new Date will parse)
    // If gives "DD-MMM-YY" like "18-Sep-25", try custom parse:
    const shortDateMatch = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
    if (shortDateMatch) {
      const d = parseInt(shortDateMatch[1], 10);
      const mStr = shortDateMatch[2].toUpperCase();
      const y = 2000 + parseInt(shortDateMatch[3], 10);
      const months: Record<string, number> = {
        JAN: 0,
        FEB: 1,
        MAR: 2,
        APR: 3,
        MAY: 4,
        JUN: 5,
        JUL: 6,
        AUG: 7,
        SEP: 8,
        OCT: 9,
        NOV: 10,
        DEC: 11,
      };
      const mm = months[mStr] ?? 0;
      s = new Date(y, mm, d).toISOString();
    }

    // Try to create Date
    let date = new Date(s);

    // If still invalid, try replace space->T once more (defensive)
    if (isNaN(date.getTime()) && s.includes(" ")) {
      const tryIso = s.replace(" ", "T");
      date = new Date(tryIso);
    }

    if (isNaN(date.getTime())) return "-";

    // Use en-US to guarantee AM/PM display; set timeZone Karachi
    return date
      .toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true, // AM / PM
        timeZone: "Asia/Karachi",
      })
      .replace(",", ""); // optional: remove comma between date and time
  }, []);

  // const formatISODate = (localString: string) => {
  //   if (!localString) return null;
  //   return new Date(localString).toISOString();
  // };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const numericFields = [
      "firstWeight",
      "secondWeight",
      "netWeight",
      "bardanaWeight",
      "grossWeight",
      "freight",
      "companyId",
      "branchId",
      "createdBy",
      "lastUpdatedBy",
      "wtPerBag",
      "noOfBags",
    ];

    if (numericFields.includes(name)) {
      if (value === "" || /^\d*\.?\d*$/.test(value)) {
        setFormData((prev) => {
          const newData = { ...prev, [name]: value };

          // Auto-calculate bardana weight when wtPerBag or noOfBags changes
          if (name === "wtPerBag" || name === "noOfBags") {
            const wtPerBag =
              parseFloat(name === "wtPerBag" ? value : prev.wtPerBag) || 0;
            const noOfBags =
              parseFloat(name === "noOfBags" ? value : prev.noOfBags) || 0;
            const calculatedBardanaWeight = wtPerBag * noOfBags;
            newData.bardanaWeight =
              calculatedBardanaWeight > 0
                ? String(calculatedBardanaWeight)
                : "";
          }

          return newData;
        });
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const toggleOnlineMode = (isOnline: boolean) => {
    console.log(
      "toggleOnlineMode called with:",
      isOnline,
      "Current onlineMode:",
      onlineMode
    );

    // Only update if mode actually changes
    if (onlineMode !== isOnline) {
      setOnlineMode(isOnline);

      // Update URL to reflect the current mode
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set("type", isOnline ? "online" : "offline");
      const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
      window.history.replaceState({}, "", newUrl);

      // Update form data to reflect the mode change
      setFormData((prev) => ({
        ...prev,
        onlineEntry: isOnline ? "Yes" : "No",
        offlineEntry: isOnline ? "No" : "Yes",
      }));

      console.log("Mode changed to:", isOnline ? "ONLINE" : "OFFLINE");
    }
  };

  const readLicensePlate = async () => {
    setPlateReading(true);
    try {
      console.log("Starting license plate recognition...");
      const response = await fetch("/api/cameras/read-plate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cameraId: 1 }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("OCR Response:", result);

        if (result.success && result.plateNumber) {
          setFormData((prev) => ({ ...prev, vehicleNo: result.plateNumber }));
          console.log(
            "License plate detected:",
            result.plateNumber,
            "Method:",
            result.method
          );

          // Show success message with method info
          const methodText =
            result.method === "camera_anpr_api"
              ? "Camera ANPR"
              : "Computer Vision OCR";
          alert(
            `License plate detected: ${
              result.plateNumber
            }\nMethod: ${methodText}\nConfidence: ${(
              result.confidence * 100
            ).toFixed(0)}%`
          );
        } else {
          console.log("No license plate detected:", result.error);
          alert(
            `License plate recognition failed:\n${result.error}\n\nPlease ensure:\n- Camera is connected and accessible\n- Vehicle with license plate is visible in camera view\n- Camera has clear view of the license plate`
          );
        }
      } else {
        const errorText = await response.text();
        console.error("API error:", errorText);
        alert("Failed to process camera image");
      }
    } catch (error) {
      console.error("Error reading license plate:", error);
      alert("Error connecting to camera system");
    }
    setPlateReading(false);
  };

  // ===== MAXIMUM PERFORMANCE STATIC DATA FETCHING =====
  // Fetch entry types, branches, customers, and items with aggressive caching
  const { data: entryTypesData = [] } = useQuery({
    queryKey: ["/api/entry-types"],
    staleTime: 60 * 60 * 1000, // Cache for 1 hour (static data)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const { data: branchesData = [] } = useQuery({
    queryKey: ["/api/branches"],
    staleTime: 60 * 60 * 1000, // Cache for 1 hour (static data)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

 const { data: customersData = [] } = useQuery({
    queryKey: ["/api/customers", formData.branchId],
    queryFn: async ({ queryKey }) => {
        const [, branchId] = queryKey;
        
        if (!branchId) {
            console.log("No branchId, returning empty");
            return [];
        }
        
        console.log("Fetching customers for branch:", branchId);
        
        try {
            const response = await fetch(`/api/customers?branch_id=${branchId}`);
            const result = await response.json();
            
            if (result.success) {
                console.log("Customers found:", result.data?.length);
                return result.data || [];
            }
            return [];
        } catch (error) {
            console.error("Error:", error);
            return [];
        }
    },
    enabled: !onlineMode && !!formData.branchId,
    staleTime: 30 * 60 * 1000,
});

  const { data: itemsData = [] } = useQuery({
    queryKey: ["/api/items"],
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    enabled: !onlineMode, // Only fetch when in offline mode
  });

  // Update state when data changes
  useEffect(() => {
    if (entryTypesData) setEntryTypes(entryTypesData);
  }, [entryTypesData]);

  useEffect(() => {
    if (branchesData) setBranches(branchesData);
  }, [branchesData]);

 useEffect(() => {
    if (customersData) setCustomers(customersData);
  }, [customersData]);


 useEffect(() => {
  if (itemsData && Array.isArray(itemsData)) {
    // Transform items data to match expected format
    const transformedItems = itemsData.map(item => ({
      id: item.item_id,
      description: item.item_desc,
      item_desc: item.item_desc,  // Keep original for compatibility
      code: item.item_code,
      item_code: item.item_code,  // Keep original for compatibility
      gl_asset_id: item.gl_asset_id
    }));
    //console.log("✅ Transformed items:", transformedItems.length);
    setItems(transformedItems);
  }
}, [itemsData]);


  // Handle URL parameters for edit mode and form type
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editWbId = urlParams.get("edit");
    const searchMode = urlParams.get("search");
    const typeMode = urlParams.get("type");

    console.log("URL parameters:", { editWbId, searchMode, typeMode });

    // Set online/offline mode based on type parameter - IMMEDIATE UPDATE
    if (typeMode === "offline") {
      console.log("Setting OFFLINE mode from URL parameter");
      setOnlineMode(false);
    } else if (typeMode === "online") {
      console.log("Setting ONLINE mode from URL parameter");
      setOnlineMode(true);
    }

    // Check if we should be in search mode
    if (searchMode === "true") {
      setIsSearchMode(true);
      setIsEditMode(false);
      setEditingWbId(null);
      setFormData((prev) => ({ ...prev, slipNo: "" }));
      return;
    }

    // Check if we should be in edit mode based on URL parameter
    if (editWbId) {
      // Load record for editing by wb_id
      console.log(
        "Edit mode detected from URL parameter, loading data for wb_id:",
        editWbId
      );
      loadDataByWbId(parseInt(editWbId));
      return; // Exit early to prevent any other initialization
    } else {
      // No edit parameter in URL, reset to new form only if not already in edit mode
      if (isEditMode) {
        console.log(
          "No edit parameter in URL but currently in edit mode, resetting to new form"
        );
        setIsEditMode(false);
        setEditingWbId(null);
        setTimeout(() => {
          resetFormToInitial();
        }, 100);
      } else if (!formData.slipNo || formData.slipNo === "") {
        // Only reset if we don't have form data already
        console.log(
          "No edit parameter and no form data, initializing new form"
        );
        setTimeout(() => {
          resetFormToInitial();
        }, 100);
      }
    }
  }, [location]);

  // Sync form data when onlineMode changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      onlineEntry: onlineMode ? "Yes" : "No",
      offlineEntry: onlineMode ? "No" : "Yes",
    }));
  }, [onlineMode]);

  // Update sales data with branch names when branches are loaded and we're in edit mode
  useEffect(() => {
    if (
      branches.length > 0 &&
      isEditMode &&
      formData.branchId &&
      salesData.length > 0
    ) {
      const branchName =
        branches.find(
          (b) => b.branch_id.toString() === formData.branchId?.toString()
        )?.branch_name || "";

      if (branchName && salesData.some((row) => row.branch === "")) {
        setSalesData((prevData) =>
          prevData.map((row) => ({
            ...row,
            branch:
              row.customerName || row.dcNo || row.doNo
                ? branchName
                : row.branch,
          }))
        );
        console.log("Updated sales data with branch names:", branchName);
      }
    }
  }, [branches, isEditMode, formData.branchId, salesData]);

  // Additional effect to handle URL changes for real-time mode switching
  useEffect(() => {
    const handleURLChange = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const typeMode = urlParams.get("type");

      if (typeMode === "offline" && onlineMode) {
        setOnlineMode(false);
      } else if (typeMode === "online" && !onlineMode) {
        setOnlineMode(true);
      }
    };

    // Check URL on component mount and location changes
    handleURLChange();
  }, [location, onlineMode]);

  useEffect(() => {
    // Check if we're in edit mode before fetching next slip number
    const urlParams = new URLSearchParams(window.location.search);
    const editWbId = urlParams.get("edit");

    // Only fetch next slip number if not in edit mode
    if (!editWbId && !isEditMode && !editingWbId) {
      // Fetch next slip number specific to SALE entry type
      fetch("/api/purchases/next-slip?entry_type=SALE")
        .then((res) => res.json())
        .then((data: any) => {
          setFormData((prev) => ({ ...prev, slipNo: data.nextSlipNo }));
        })
        .catch((err: any) => {
          console.error("Error fetching next slip number:", err);
          setFormData((prev) => ({ ...prev, slipNo: prev.slipNo || "" }));
        });
    }

    // Fetch branches for dropdown
    fetch("/api/branches")
      .then((res) => res.json())
      .then((data: any[]) => {
        setBranches(data);
        console.log("Branches fetched:", data);

        // Always set default branch based on logged-in user's branch
        if (data.length > 0) {
          const userBranchId = user?.branchId;
          const defaultBranch = userBranchId
            ? data.find((b) => b.branch_id === userBranchId) || data[0]
            : data[0];
          setFormData((prev) => ({
  ...prev,
  branchId: String(defaultBranch.branch_id),
  branch: String(defaultBranch.branch_id),
  createdBy: String(user?.userid || ""),
}));
        }
      })
      .catch((err: any) => {
        console.error("Error fetching branches:", err);
      });

    const now = new Date().toISOString();
    setFormData((prev) => ({
      ...prev,
      slipInTime: formatDatetimeLocal(now),
      creationDate: now,
      lastUpdatedDate: now,
      slipDate: now,
    }));
  }, []);

const resetForm = () => {
  // When Clear button is pressed, clear everything except Slip No
  const currentSlipNo = formData.slipNo;
  setFormData({
    ...initialFormData,
    slipNo: currentSlipNo,
  });
  setIsEditMode(false);
  setEditingWbId(null);
  // Keep current online/offline mode

  // ---- Call the same function logic as Button ----
  if (showOfflineEntries) return; // Disabled state check
  setSelectedForm("sales"); // Mark as active
  const urlParams = new URLSearchParams(window.location.search);
  const typeMode = urlParams.get("type") || "online";
  const targetUrl = `/sales-form?type=${typeMode}`;
  sessionStorage.removeItem("salesFormEditMode");
  window.location.href = targetUrl;
};

  
  
const captureFirstWeight = async () => {
  try {
    // 1️⃣ Get current weight
    const response = await fetch("/api/weight/data");
    const weightData = await response.json();

    // 2️⃣ Update firstWeight in form state
    setFormData(prev => ({
      ...prev,
      firstWeight: weightData.weight,
    }));

    console.log("First weight captured:", weightData.weight);

    // 3️⃣ Capture first weight image if slip number exists
    if (formData.slipNo) {
      try {
        console.log("Capturing first weight image for slip:", formData.slipNo);

        // Add a flag "update: true" to indicate this should overwrite existing image
        const captureResponse = await fetch("/api/capture/first-weight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slipNo: formData.slipNo,
            cameraIp: "10.10.10.146",
            cameraPort: 554,
            entryType: formData.entryType || "SALE",
            update: true, // <-- tells backend to overwrite if image exists
          }),
        });

       if (captureResponse.ok) {
  const captureData = await captureResponse.json();
  console.log("Success:", captureData);
} else {
  const errorData = await captureResponse.json();
  console.error("Backend Error:", errorData);
}
      } catch (imageError) {
        console.error("Error capturing/updating first weight image:", imageError);
      }
    }
  } catch (error) {
    console.error("Error fetching weight data:", error);
    //alert("Failed to capture first weight reading");
  }
};


const captureSecondWeight = async () => {
  try {
    // 1️⃣ Get current weight
    const response = await fetch("/api/weight/data");
    const weightData = await response.json();

    const currentTime = new Date().toISOString();

    // 2️⃣ Update secondWeight and slipOutTime in form state
    setFormData(prev => ({
      ...prev,
      secondWeight: weightData.weight,
      slipOutTime: currentTime.slice(0, 16), // datetime-local format
    }));

    console.log("Second weight captured:", weightData.weight);

    // 3️⃣ Capture second weight image if slip number exists
    if (formData.slipNo) {
      try {
        console.log("Capturing second weight image for slip:", formData.slipNo);

        // Add `update: true` same as first weight
        const captureResponse = await fetch("/api/capture/second-weight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slipNo: formData.slipNo,
            cameraIp: "10.10.10.146",
            cameraPort: 554,
            entryType: formData.entryType || "SALE",
            update: true, // <-- ensure old image deleted
          }),
        });

        if (captureResponse.ok) {
          const captureData = await captureResponse.json();
          console.log("Second weight image captured successfully:", captureData.message);
        } else {
          const errorData = await captureResponse.json();
          console.error("Backend Error:", errorData);
        }

      } catch (imageError) {
        console.error("Error capturing/updating second weight image:", imageError);
      }
    }

  } catch (error) {
    console.error("Error fetching weight data:", error);
   // alert("Failed to capture second weight reading");
  }
};



  const currentSlipNo = formData.slipNo;


  // ✅ Fetch sale data from DB by wbId (for IGP API)
const fetchSaleDataForIGP = async (wbId: number) => {
  try {
    const response = await fetch(`/api/sales/by-wbid/${wbId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch sale data for wbId: ${wbId}`);
    }
    const data = await response.json();
    return data; // Raw data from DB
  } catch (error: any) {
    console.error("Error fetching sale data for IGP:", error);
    return null; // Return null if fetch fails
  }
};


  // ✅ Helper: PKT datetime string (Asia/Karachi)
  const getPKTDateTime = () => {
    const now = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" })
    );
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };





function autoPrintSlip(
  masterData: any,
  salesData: any[],
  currentUserName: string,
  apiData: any
) {
  // ✅ masterData se check karo — formData se nahi
  const hasFirstWeight = masterData.first_weight && parseFloat(masterData.first_weight) > 0;
  const hasSecondWeight = masterData.second_weight && parseFloat(masterData.second_weight) > 0;

  if (!hasFirstWeight) {
    console.log("No weight data available to print.");
    return;
  }

  // ✅ salesData ko dbRows format mein convert karo
  const dbRows = (salesData || [])
    .filter((row: any) =>
      row.dc_no || row.do_no || row.customer_name ||
      row.item_code || row.item_desc || row.dc_qty ||
      row.igp_no || row.vendor_name
    )
    .map((row: any) => ({
      dcNo:            row.dc_no || row.igp_no || "",
      doNo:            row.do_no || row.po_no || "",
      customerName:    row.customer_name || row.vendor_name || "",
      vehicleNo:       row.vehicle_no || "",
      itemCode:        row.item_code || "",
      itemDescription: row.item_desc || "",
      dcQty:           row.dc_qty ? String(row.dc_qty) : (row.igp_qty ? String(row.igp_qty) : ""),
      doQty:           row.do_qty ? String(row.do_qty) : (row.po_qty ? String(row.po_qty) : ""),
    }));

  // ✅ vehicle_no masterData se lo, nahi mila to dbRows se
  const vehicleNo = masterData.vehicle_no || dbRows[0]?.vehicleNo || "";
  console.log("🚚 Vehicle number for printing:", vehicleNo);
  console.log("📋 dbRows for print:", dbRows);

  const masterSlipInTime = masterData.slip_in_time || getPKTDateTime();
  const masterSlipOutTime = masterData.slip_out_time || null;

  if (hasFirstWeight && hasSecondWeight) {
    const oldReportHTML = generateReportHTML(
      "second",
      masterSlipInTime,
      masterSlipOutTime,
      vehicleNo,
      apiData,
      dbRows  // ✅
    );
    const newReportHTML = generateNewReportHTML(
      masterSlipInTime,
      masterSlipOutTime,
      vehicleNo,
      apiData,
      dbRows  // ✅
    );
    preparePrintWindow(oldReportHTML, "Weighbridge Report");
    preparePrintWindow(newReportHTML, "Feeds Dispatch Order");

  } else if (hasFirstWeight) {
    const oldReportHTML = generateReportHTML(
      "first",
      masterSlipInTime,
      null,
      vehicleNo,
      apiData,
      dbRows  // ✅
    );
    const window1 = preparePrintWindow(oldReportHTML, "Weight Report");
    if (window1) {
      setTimeout(() => window1.print(), 500);
    }
  }
}

  





const handleSave = async () => {
  setLoading(true);

  // ✅ Validate first weight
  if (
    !formData.firstWeight ||
    formData.firstWeight.trim() === "" ||
    parseFloat(formData.firstWeight) <= 0
  ) {
    alert("First weight is required and must be greater than 0");
    setLoading(false);
    return;
  }

  // ✅ Vehicle number resolve
  let finalVehicleNo = "";
  const vehicleNoFromDetails = salesData
    .find((row) => row.vehicleNo?.trim())
    ?.vehicleNo?.trim();
  finalVehicleNo = vehicleNoFromDetails || formData.vehicleNo?.trim() || "";

  if (!finalVehicleNo || finalVehicleNo === "") {
    alert("Vehicle number is required");
    setLoading(false);
    return;
  }

  // ✅ Store vehicle number locally before saving
  if (finalVehicleNo) {
    try {
      localStorage.setItem('lastVehicleNo', finalVehicleNo);
      console.log("✅ Vehicle number saved locally:", finalVehicleNo);
    } catch (e) {
      console.log("⚠️ Could not save vehicle number locally:", e);
    }
  }

  // ✅ Force PKT time handling
  const slipInTime = formData.slipInTime || getPKTDateTime();

  // ✅ Automatically set slipOutTime when 2nd weight is entered
  const slipOutTime =
    formData.secondWeight && parseFloat(formData.secondWeight) > 0
      ? getPKTDateTime()
      : formData.slipOutTime || null;

  // ✅ Weight diff check
  if (
    formData.firstWeight &&
    formData.secondWeight &&
    formData.netWeight &&
    parseFloat(formData.firstWeight) > 0 &&
    parseFloat(formData.secondWeight) > 0 &&
    parseFloat(formData.netWeight) > 0
  ) {
    if (((totalWeightDiff) > 30) || ((totalWeightDiff) < -30)) {
      alert(
        `Total Weight Difference (${totalWeightDiff.toFixed(
          2
        )}) is outside acceptable range of ±30. Entry cannot be saved.`
      );
      setLoading(false);
      return;
    }
  }

  try {
    let savedWbId: number;



    // ye main update ka payload hai  hamza

    if (isEditMode && editingWbId) {
      // 🔄 UPDATE MODE
      console.log("Updating existing sales record with wb_id:", editingWbId);

      const updatePayload = {
        slip_no: formData.slipNo || null,
        slip_in_time: slipInTime,
        slip_out_time: slipOutTime,
        first_weight: formData.firstWeight
          ? parseFloat(formData.firstWeight)
          : null,
        second_weight: formData.secondWeight
          ? parseFloat(formData.secondWeight)
          : null,
        net_weight: formData.netWeight
          ? parseFloat(formData.netWeight)
          : null,
        bardana_weight: formData.bardanaWeight || null,
        gross_weight: formData.grossWeight
          ? parseFloat(formData.grossWeight)
          : null,
        freight: formData.freight ? parseFloat(formData.freight) : null,
        remarks: formData.remarks || null,
        driver_name: formData.driverName || null,
        company_id: formData.companyId
          ? parseInt(formData.companyId, 10)
          : null,
        branch_id: formData.branchId ? parseInt(formData.branchId, 10) : null,
        online_entry: formData.onlineEntry === "Yes" ? "Yes" : null,
        offline_entry: formData.offlineEntry === "Yes" ? "Yes" : null,

        last_updated_by: user?.userid || null,
        last_updated_date: getPKTDateTime(),
        manual_dc_no: formData.manualDcNo || null,
                freightchild: formData.freightChild || null,

        status: onlineMode ? "ONLINE" : "OFFLINE",
        slip_date: getPKTDateTime(),

        // ✅ sales fields
        vendor_name:
          salesData.find((row) => row.customerName)?.customerName || null,
        vehicle_no: finalVehicleNo,
        po_no: salesData.find((row) => row.doNo)?.doNo || null,
        igp_no: salesData.find((row) => row.dcNo)?.dcNo || null,
        item_desc:
          salesData.find((row) => row.itemDescription?.trim())?.itemDescription || null,




                  item_code:
          salesData.find((row) => row.item_code?.trim())?.item_code || null,

       second_weight_by: user?.userid ? parseInt(user.userid.toString()) : null,
        po_qty: salesData.find((row) => row.doQty)?.doQty
          ? parseFloat(salesData.find((row) => row.doQty)?.doQty!)
          : null,
        igp_qty: salesData.find((row) => row.dcQty)?.dcQty
          ? parseFloat(salesData.find((row) => row.dcQty)?.dcQty!)
          : null,
        igp_date: salesData.find((row) => row.doDate)?.doDate || null,
      };

      const updateResponse = await fetch(
        `/api/purchase/update/${editingWbId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
        }
      );

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Failed to update sales record: ${errorText}`);
      }

      savedWbId = editingWbId;
      console.log("Sales record updated successfully");

 // ✅ CORRECTION: ADD CHILD RECORD SAVING FOR UPDATE MODE HERE
  // Filter non-empty rows
  const nonEmptyRows = salesData.filter(
    (row) =>
      row.dcNo ||
      row.doNo ||
      row.customerName ||
      row.vehicleNo ||
      row.itemDescription ||
      row.dcQty ||
      row.doQty
  );

  const totalFeedBags = nonEmptyRows.reduce(
    (sum, row) => sum + (parseFloat(row.doQty) || 0),
    0
  );

  // First, delete existing child records for this wb_id
  console.log("Clearing existing child records for wb_id:", savedWbId);
  // try {
  //   const deleteResponse = await fetch(`/api/purchase-items/by-wbid/${savedWbId}`, {
  //     method: "DELETE"
  //   });
    
  //   if (deleteResponse.ok) {
  //     console.log("Existing child records deleted");
  //   }
  // } catch (deleteError) {
  //   console.log("Note: Could not delete old records, continuing:", deleteError);
  // }

  // Save new child records
  for (const row of nonEmptyRows) {
    const salesItemPayload = {
        wb_item_p_id: row.wb_item_p_id || null,
      branch_id:
        formData.branchId &&
        formData.branchId !== "undefined" &&
        formData.branchId.trim() !== ""
          ? parseInt(formData.branchId, 10)
          : user?.branchId
            ? parseInt(user.branchId.toString(), 10)
            : null,

      wb_id: savedWbId,
      bardana_type: null,
      igp_no: row.dcNo || null,
      manual_dc_no: row.dcNo || null,
      dc_id: row.dcId || null,
      vehicle_no: finalVehicleNo || row.vehicleNo || null,
      weight_per_bags: formData.weightPerBags
        ? parseFloat(formData.weightPerBags)
        : null,
      total_feed_bags: totalFeedBags || null,
      igp_date: row.doDate || null,
      do_date: row.doDate || null,
      supplier_weight: null,
      quality_deduction: null,
      bardana_weight: null,
      no_of_bags: null,
      vendor_name: row.customerName || null,
      bag_condition: null,
      po_no: row.doNo || null,
      po_id: row.po_id ? parseInt(row.po_id, 10) : null,
      freight_child:
        row.freight && row.freight !== "" && row.freight !== "0"
          ? parseFloat(row.freight)
          : null,
              
          remarks: row.remarks || null, 
      item_code: row.itemCode || null,
      item_desc: row.itemDescription || null,
      item_id: row.itemId ? parseInt(row.itemId, 10) : null,
      po_qty:
        row.doQty && row.doQty.trim() !== ""
          ? parseFloat(row.doQty)
          : null,
      igp_qty:
        row.dcQty && row.dcQty.trim() !== ""
          ? parseFloat(row.dcQty)
          : null,
      balance_qty: null,
      customer_name: row.customerName || null,
      customer_id: row.customerId || null,
      do_no: row.doNo || null,
      do_qty:
        row.doQty && row.doQty.trim() !== ""
          ? parseFloat(row.doQty)
          : null,
      dc_qty:
        row.dcQty && row.dcQty.trim() !== ""
          ? parseFloat(row.dcQty)
          : null,
      created_by: user?.userid ? parseInt(user.userid.toString(), 10) : null,
      last_updated_by: user?.userid ? parseInt(user.userid.toString(), 10) : null,
    };

    const salesItemResponse = await fetch("/api/purchase-items", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(salesItemPayload),
    });

    if (!salesItemResponse.ok) {
      console.error("Failed to save sales item in update mode:", row);
      // Continue anyway - don't fail the whole update for one item
    } else {
      console.log("Sales item saved successfully in update mode");
    }
  }

      setFormData(prev => ({
        ...prev,
        isFirstWeightSaved: !!formData.firstWeight,
      }));

      setFormData(prev => ({
        ...prev,
        isSecondWeightSaved: !!formData.secondWeight,
      }));


      // update ki api ke baad igp api ko call horhi hai hamza

      // ✅ Call IGP API for Sale after 2nd weight (edit mode)
      if (isEditMode && formData.onlineEntry === "Yes" && formData.secondWeight) {
        console.log("📡 Preparing to call IGP API for Sale edit mode (2nd weight)...");

        setTimeout(async () => {
          try {
            const wbId = Number(savedWbId || formData.wbId);
            if (!wbId) {
              console.error("❌ Invalid wbId, skipping Sale IGP API call (edit mode).");
              return;
            }

            const dbData = await fetchSaleDataForIGP(wbId);

            if (!dbData) {
              console.error("❌ DB data not available for Sale IGP API call (edit mode).");
              return;
            }

            console.log("📥 Sale DB data fetched for IGP API (edit mode):", dbData);

            const igpResp = await fetch(
              "http://portal.sabirsgroup.com:8184/ords/sabroso_ords/wb-sf/wb-update-on-igp",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dbData),
              }
            );

            const rawText = await igpResp.text();
            console.log("🧾 Raw Sale IGP API response (edit mode):", rawText);

            let igpData;
            try {
              igpData = JSON.parse(rawText);
            } catch {
              console.error("❌ Sale IGP API did not return JSON (edit mode). Raw response logged above.");
              return;
            }

            if (igpResp.ok && (igpData.status?.toLowerCase() === "success" || Array.isArray(igpData.items))) {
              console.log("✅ SALE IGP Data Uploaded Successfully (edit mode):", igpData);
            } else {
              console.error("❌ SALE IGP Upload Failed (edit mode). Response:", igpData);
            }
          } catch (err) {
            console.error("🛑 SALE IGP API Error (edit mode):", err);
          }
        }, 2000);
      }

    } else {
      // CREATE MODE: Create new record
      console.log("Creating new sales record");

      // Generate WB_ID for the sales record
      const wbIdResponse = await fetch("/api/purchases", {
        method: "GET",
      });
      const existingRecords = await wbIdResponse.json();
      const maxWbId =
        existingRecords.length > 0
          ? Math.max(...existingRecords.map((r: any) => r.wb_id || 0))
          : 0;
      const newWbId = maxWbId + 1;

      // Prepare master data payload with proper null handling for numeric fields
      const masterPayload = {
        slip_no: formData.slipNo || null,
        slip_in_time: slipInTime,

        first_weight:
          formData.firstWeight && formData.firstWeight.trim() !== ""
            ? parseFloat(formData.firstWeight)
            : null,
        second_weight:
          formData.secondWeight && formData.secondWeight.trim() !== ""
            ? parseFloat(formData.secondWeight)
            : null,
        net_weight:
          formData.netWeight && formData.netWeight.trim() !== ""
            ? parseFloat(formData.netWeight)
            : null,
        bardana_weight:
          formData.bardanaWeight && formData.bardanaWeight.trim() !== ""
            ? parseFloat(formData.bardanaWeight)
            : null,
        gross_weight:
          formData.grossWeight && formData.grossWeight.trim() !== ""
            ? parseFloat(formData.grossWeight)
            : null,
        freight:
          formData.freight && formData.freight.trim() !== ""
            ? parseFloat(formData.freight)
            : null,
        remarks: formData.remarks || null,
        driver_name: formData.driverName || null,
        company_id:
          formData.companyId &&
          formData.companyId !== "undefined" &&
          formData.companyId.trim() !== ""
            ? parseInt(formData.companyId, 10)
            : null,
        branch_id:
          formData.branchId &&
          formData.branchId !== "undefined" &&
          formData.branchId.trim() !== ""
            ? parseInt(formData.branchId, 10)
            : null,
        online_entry: formData.onlineEntry === "Yes" ? "Yes" : null,
        offline_entry: formData.offlineEntry === "Yes" ? "Yes" : null,

        created_by: user?.userid || null,
        creation_date: formData.creationDate || null,
        last_updated_by: user?.userid || null,
        last_updated_date: formData.lastUpdatedDate || null,
        manual_dc_no: formData.manualDcNo || null,
        entry_type: "SALE",
        slip_out_time: slipOutTime,
        status: onlineMode ? "ONLINE" : "OFFLINE",
        slip_date: formData.slipDate || null,
        vehicle_no: finalVehicleNo, // ✅ Ensure vehicle_no is saved
        
      };

      // Naya master record create karna
      const masterResponse = await fetch("/api/purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(masterPayload),
      });

      if (!masterResponse.ok) {
        const errorText = await masterResponse.text();
        throw new Error(`Failed to save master sales record: ${errorText}`);
      }

      // Backend se naya bana hua record le lo (isme wb_id hoga)
      const createdRecord = await masterResponse.json();

      // Wb_id ko variable me store kar lo
      savedWbId = createdRecord.wb_id;
    }


   // 🔄 AUTO-PRINT with /api/form-report/ API
(async () => {
  try {
    // Fetch from the correct API
    const slipResponse = await fetch(`/api/form-report/${savedWbId}`);
    if (!slipResponse.ok) throw new Error("Failed to fetch sale record for auto-print");

    const slipData = await slipResponse.json();
    
    // Validate response
    if (!slipData.success) {
      console.error("API returned error:", slipData.message);
      return;
    }

    // Extract the actual report data
    const reportData = slipData.data;
    
    // Build master object from report data
    const master = {
      wb_id: reportData.wb_id,
      vehicle_no: reportData.vehicle_no || finalVehicleNo || "-",
      slip_in_time: reportData.slip_in_time || slipInTime || getPKTDateTime(),
      entry_type: reportData.entry_type,
      first_weight: reportData.first_weight,
      second_weight: reportData.second_weight,
      net_weight: reportData.net_weight,
      created_by_name: reportData.created_by_name,
      second_weight_by_name: reportData.second_weight_by_name,
      has_second_weight: reportData.has_second_weight,
      // Preserve any other fields
      ...reportData
    };

    // Get details array (your API already formats it nicely)
    const details = Array.isArray(reportData.details) ? reportData.details : [];

    // Call the print function
    autoPrintSlip(
      master,
      details,
      user?.userName || "admin",
      master
    );
    
  } catch (err) {
    console.error("Error fetching slip for auto-print:", err);
  }
})();

    // Save sales detail records for each non-empty row (for both create and update)
    if (!isEditMode) {
      const nonEmptyRows = salesData.filter(
        (row) =>
          row.dcNo ||
          row.doNo ||
          row.customerName ||
          row.vehicleNo ||
          row.itemDescription ||
          row.dcQty ||
          row.doQty
      );

      const totalFeedBags = nonEmptyRows.reduce(
        (sum, row) => sum + (parseFloat(row.doQty) || 0),
        0
      );

      for (const row of nonEmptyRows) {


const salesItemPayload = {
   wb_item_p_id: row.wb_item_p_id || null,
  branch_id:
    formData.branchId &&
    formData.branchId !== "undefined" &&
    formData.branchId.trim() !== ""
      ? parseInt(formData.branchId, 10)
      : user?.branchId
        ? parseInt(user.branchId.toString(), 10)
        : null,

  wb_id: savedWbId,
  bardana_type: null,
  igp_no: row.dcNo || null,
  manual_dc_no: row.dcNo || null,
  dc_id: row.dcId || null,
  vehicle_no: finalVehicleNo || row.vehicleNo || null,

  weight_per_bags: formData.weightPerBags
    ? parseFloat(formData.weightPerBags)
    : null,

  total_feed_bags: totalFeedBags || null,
  igp_date: row.doDate || null,
  do_date: row.doDate || null,
  supplier_weight: null,
  quality_deduction: null,
  bardana_weight: null,
  no_of_bags: null,
  vendor_name: row.customerName || null,
  bag_condition: null,
  po_no: row.doNo || null,
  po_id: row.po_id ? parseInt(row.po_id, 10) : null,

  freight_child:
    row.freight && row.freight !== "" && row.freight !== "0"
      ? parseFloat(row.freight)
      : null,

  item_code: row.itemCode || null,
  item_desc: row.itemDescription || null,
  item_id: row.itemId ? parseInt(row.itemId, 10) : null,

  po_qty:
    row.doQty && row.doQty.trim() !== ""
      ? parseFloat(row.doQty)
      : null,

  igp_qty:
    row.dcQty && row.dcQty.trim() !== ""
      ? parseFloat(row.dcQty)
      : null,

  balance_qty: null,
  customer_name: row.customerName || null,
  customer_id: row.customerId || null,
  do_no: row.doNo || null,

  do_qty:
    row.doQty && row.doQty.trim() !== ""
      ? parseFloat(row.doQty)
      : null,

  dc_qty:
    row.dcQty && row.dcQty.trim() !== ""
      ? parseFloat(row.dcQty)
      : null,

  remarks: row.remarks || null,              // ✅ remarks hi rakha

  created_by: user?.userid ? parseInt(user.userid.toString(), 10) : null,
  last_updated_by: user?.userid ? parseInt(user.userid.toString(), 10) : null,
};


        const salesItemResponse = await fetch("/api/purchase-items", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(salesItemPayload),
        });

        if (!salesItemResponse.ok) {
          console.error("Failed to save sales item:", row);
        }
      }
    }

    console.log("Sales data saved successfully");
    alert(
      isEditMode
        ? "Sales data updated successfully!"
        : "Sales data saved successfully!"
    );

    // ✅ Call IGP API for Sale only if online entry and new entry
    if (!isEditMode && formData.onlineEntry === "Yes") {
      console.log("📡 Preparing to call IGP API for new Sale entry...");

      setTimeout(async () => {
        const wbIdToUse = Number(savedWbId || formData.wbId);

        if (!wbIdToUse || wbIdToUse === 0) {
          console.error("❌ Invalid wbId — cannot call Sale IGP API. wbId:", wbIdToUse);
          return;
        }

        console.log("🔍 Using wbId for SALE IGP API:", wbIdToUse);

        try {
          const dbData = await fetchSaleDataForIGP(wbIdToUse);
          if (!dbData) {
            console.error("❌ DB data not available for SALE IGP API call. wbId:", wbIdToUse);
            return;
          }

          console.log("✅ Sale DB data fetched successfully:", dbData);

          const IGP_API_URL =
            "http://portal.sabirsgroup.com:8184/ords/sabroso_ords/wb-sf/wb-update-on-igp";

          console.log("🌐 Sending SALE IGP payload to API:", IGP_API_URL);

          const igpResp = await fetch(IGP_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dbData),
          });

          const rawText = await igpResp.text();
          console.log("🧾 Raw SALE IGP API response:", rawText);

          let igpData;
          try {
            igpData = JSON.parse(rawText);
          } catch {
            console.warn("⚠️ SALE IGP API did not return JSON. Raw response logged above.");
            return;
          }

          if (
            igpResp.ok &&
            (igpData.status?.toLowerCase() === "success" || Array.isArray(igpData.items))
          ) {
            console.log("✅ SALE IGP Data Uploaded Successfully. Response:", igpData);
          } else {
            console.error("❌ SALE IGP Upload Failed. Response:", igpData);
          }
        } catch (err) {
          console.error("🛑 SALE IGP API Error:", err);
        }
      }, 1500);
    } else {
      console.log("⚙️ Skipping SALE IGP API — either offline or edit mode");
    }

    // Invalidate queries to refresh display table immediately
    await queryClient.invalidateQueries({
      queryKey: ["/api/purchase/first-weight-records"],
    });
    await queryClient.invalidateQueries({
      queryKey: ["/api/purchases/offline"],
    });

    // Reset sales data table after successful save
    setSalesData(
      Array.from({ length: 8 }, (_, index) => ({
        doId: "",
        dcNo: "",
        doNo: "",
        customerName: "",
        vehicleNo: "",
        doDate: "",
        itemDescription: "",
        dcQty: "",
        doQty: "",
        branch: "",
        // Hidden columns for database storage
        dcId: "",
        customerId: "",
        itemId: "",
        itemCode: "",
      }))
    );
  } catch (err: any) {
    const errorMessage = err.message || "Failed to save sales data.";
    alert(errorMessage);
    console.error("Save error:", err);
  } finally {
    setLoading(false);
  }

  // Automatically capture first weight image
  // if (formData.firstWeight && !formData.secondWeight) {
  //   try {
  //     console.log("Capturing first weight image for slip:", formData.slipNo);
  //     const captureResponse = await fetch("/api/capture/first-weight", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         slipNo: formData.slipNo,
  //         cameraIp: "10.10.10.146",
  //         cameraPort: 554,
  //         entryType: formData.entryType || "sale",
  //       }),
  //     });

  //     if (captureResponse.ok) {
  //       const captureData = await captureResponse.json();
  //       console.log(
  //         "First weight image captured successfully:",
  //         captureData.message
  //       );
  //     } else {
  //       console.log(
  //         "First weight image capture failed, but continuing with form submission"
  //       );
  //     }
  //   } catch (imageError) {
  //     console.log(
  //       "First weight image capture error, but continuing:",
  //       imageError
  //     );
  //   }
  // }

  // Automatically capture second weight image when both weights are present
  // if (formData.firstWeight && formData.secondWeight) {
  //   try {
  //     console.log("Capturing second weight image for slip:", formData.slipNo);
  //     const captureResponse = await fetch("/api/capture/second-weight", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         slipNo: formData.slipNo,
  //         cameraIp: "10.10.10.146",
  //         cameraPort: 554,
  //         entryType: formData.entryType || "sale",
  //       }),
  //     });

  //     if (captureResponse.ok) {
  //       const captureData = await captureResponse.json();
  //       console.log(
  //         "Second weight image captured successfully:",
  //         captureData.message
  //       );
  //     } else {
  //       console.log(
  //         "Second weight image capture failed, but continuing with form submission"
  //       );
  //     }
  //   } catch (imageError) {
  //     console.log(
  //       "Second weight image capture error, but continuing:",
  //       imageError
  //     );
  //   }
  // }

  // If second weight was entered, refresh to remove from display table
  if (formData.secondWeight && parseFloat(formData.secondWeight) > 0) {
    console.log(
      "Second weight added for sales entry, refreshing to remove from display table"
    );
    setTimeout(() => {
      window.location.reload();
    }, 4000);
    return;
  }

  // Exit edit mode after successful save/update
  if (isEditMode) {
    setIsEditMode(false);
    setEditingWbId(null);
    sessionStorage.removeItem("salesFormEditMode");

    // Clear URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.delete("edit");
    const newUrl = urlParams.toString()
      ? `${window.location.pathname}?${urlParams.toString()}`
      : window.location.pathname;
    window.history.replaceState({}, "", newUrl);

    // Fetch next slip number for new entry after edit
    try {
      const response = await fetch(
        "/api/purchases/next-slip?entry_type=SALE"
      );
      const data = await response.json();

      setFormData({
        ...initialFormData,
        slipNo: data.nextSlipNo,
        slipInTime: new Date().toISOString().slice(0, 16),
        onlineEntry: onlineMode ? "Yes" : "No",
        offlineEntry: onlineMode ? "No" : "Yes",
        entryType: "SALE",
        creationDate: new Date().toISOString(),
        lastUpdatedDate: new Date().toISOString(),
        slipDate: new Date().toISOString(),
        branchId: user?.branchId ? String(user.branchId) : "4",
        branch: user?.branchId ? String(user.branchId) : "4",
        createdBy: user?.userid || "",
      });

      // Reset sales data table
      setSalesData(
        Array.from({ length: 8 }, (_, index) => ({
          doId: "",
          dcNo: "",
          doNo: "",
          customerName: "",
          vehicleNo: "",
          doDate: "",
          itemDescription: "",
          dcQty: "",
          doQty: "",
          branch: "",
          dcId: "",
          customerId: "",
          itemId: "",
          itemCode: "",
        }))
      );

      console.log(
        "✅ Form reset to new entry with slip number:",
        data.nextSlipNo
      );
    } catch (error) {
      console.error("Error fetching next slip number:", error);
      resetFormToInitial();
    }
  } else {
    resetFormToInitial();
  }
};







// ctrl + s command for save the entry 
useEffect(() => {
  const handleKeyDown = (event:any) => {
    if (event.altKey && event.key.toLowerCase() === "s") {
      event.preventDefault();
      handleSave();   // sirf yeh call hoga
    }
  };

  window.addEventListener("keydown", handleKeyDown);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
  };
}, [handleSave]);










  const navigateToFirst = async () => {
    try {
      const response = await fetch("/api/sales/first-weight-records");
      if (!response.ok) throw new Error("Failed to fetch first records");

      const records = await response.json();
      if (records && records.length > 0) {
        const firstRecord = records[records.length - 1];
        console.log("👉 First record selected:", firstRecord);

        // ❌ resetFormToInitial() hata diya
        // ✅ Directly load the record
        await loadDataByWbId(firstRecord.wb_id);
        return;
      }

      console.warn("⚠️ No records found, resetting form");
      resetFormToInitial(); // only if koi record hi na mile
    } catch (error) {
      console.error("Error navigating to first record:", error);
    }
  };

 const navigateToPrev = async () => {
  let currentSlip = parseInt(formData.slipNo);
  let prevSlip = currentSlip - 1;
  let recordFound = false;

  try {
    while (prevSlip > 0 && !recordFound) {
      const response = await fetch(`/api/sales/by-slip/${prevSlip}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.master) {
          await loadDataByWbId(data.master.wb_id);
          setFormData((prev) => ({ ...prev, slipNo: prevSlip.toString() }));
          recordFound = true;
          break;
        } else {
          prevSlip--; // missing → try previous
        }
      } else {
        prevSlip--; // missing → try previous
      }
    }

    // Agar previous record exist nahi → slip 1 pe move
    if (!recordFound) {
      setFormData((prev) => ({ ...prev, slipNo: "1" }));
    }
  } catch (error) {
    console.error("Error navigating to previous sales record:", error);
  }
};

  const navigateToNext = async () => {
    const currentSlip = parseInt(formData.slipNo);
    const nextSlip = currentSlip + 1;

    try {
      const response = await fetch(`/api/sales/by-slip/${nextSlip}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.master) {
          // pehle reset
          resetFormToInitial();

          // phir agle tick pe load
          setTimeout(() => {
            loadDataByWbId(data.master.wb_id);
          }, 0);

          return;
        }
      }

      // agar record na mila
      resetFormToInitial();
      setFormData((prev) => ({ ...prev, slipNo: nextSlip.toString() }));
    } catch (error) {
      console.error("Error navigating to next record:", error);
    }
  };

  const navigateToLast = async () => {
    try {
      const response = await fetch("/api/sales/first-weight-records");
      const records = await response.json();
      if (records.length > 0) {
        const lastRecord = records[0]; // Get newest record
        await loadDataByWbId(lastRecord.wb_id);
      }
    } catch (error) {
      console.error("Error navigating to last record:", error);
    }
  };

  // Helper function to move focus to next input field
  const moveToNextField = (currentElement: HTMLElement) => {
    const formInputs = Array.from(
      document.querySelectorAll('input, select, textarea, [role="combobox"]')
    ) as HTMLElement[];
    const currentIndex = formInputs.indexOf(currentElement);

    if (currentIndex !== -1 && currentIndex < formInputs.length - 1) {
      const nextElement = formInputs[currentIndex + 1];
      nextElement.focus();

      // If it's an input, select all text for easier editing
      if (
        nextElement instanceof HTMLInputElement ||
        nextElement instanceof HTMLTextAreaElement
      ) {
        nextElement.select();
      }
    }
  };

  // Add keyboard event listeners for Ctrl+L, F11, and Enter navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Enter key to move to next field (except for textareas and specific cases)
      if (event.key === "Enter") {
        const target = event.target as HTMLElement;

        // Don't interfere with textareas, buttons, or dropdowns
        if (
          target.tagName === "TEXTAREA" ||
          target.tagName === "BUTTON" ||
          target.getAttribute("role") === "combobox" ||
          target.closest('[role="listbox"]') ||
          target.closest(".select-content")
        ) {
          return;
        }

        // Don't interfere with form submission buttons
        if (
          ((target instanceof HTMLInputElement ||
            target instanceof HTMLButtonElement) &&
            target.type === "submit") ||
          target.classList.contains("submit-button")
        ) {
          return;
        }

        // For input fields, move to next field
        if (target.tagName === "INPUT") {
          event.preventDefault();
          moveToNextField(target);
        }
      }

      // Ctrl+L to open LOV of currently focused element
      if (event.ctrlKey && event.key.toLowerCase() === "l") {
        event.preventDefault();

        const activeElement = document.activeElement as HTMLElement;

        if (activeElement) {
          // Check if we're directly on a combobox trigger
          if (activeElement.getAttribute("role") === "combobox") {
            activeElement.click();
            return;
          }

          // Check if we're on an input that's part of a Select component
          const selectTrigger = activeElement.closest(
            '[role="combobox"]'
          ) as HTMLElement;
          if (selectTrigger) {
            selectTrigger.click();
            return;
          }

          // Get input attributes for better targeting
          const inputName = activeElement.getAttribute("name");
          const placeholder =
            activeElement.getAttribute("placeholder")?.toLowerCase() || "";
          const inputId = activeElement.getAttribute("id")?.toLowerCase() || "";

          // Strategy 1: Find LOV in the same container/cell
          const findLOVInContainer = (container: Element) => {
            return container.querySelector('[role="combobox"]') as HTMLElement;
          };

          // Strategy 2: Field-specific targeting
          let targetLOV: HTMLElement | null = null;

          // For branch field
          if (
            inputName === "branch" ||
            placeholder.includes("branch") ||
            inputId.includes("branch")
          ) {
            targetLOV =
              (document.querySelector(
                '[name="branch"] + [role="combobox"]'
              ) as HTMLElement) ||
              (document.querySelector(
                '[data-field="branch"] [role="combobox"]'
              ) as HTMLElement) ||
              findLOVInContainer(
                activeElement.closest(".flex") ||
                  activeElement.closest("div") ||
                  activeElement.parentElement!
              );
          }

          // For customer fields in sales table
          else if (
            placeholder.includes("customer") ||
            inputName === "customerName"
          ) {
            // First check the immediate table cell
            const tableCell = activeElement.closest(
              'div[class*="bg-white border border-gray-300"]'
            );
            if (tableCell) {
              targetLOV = findLOVInContainer(tableCell);
            }

            // If not found in cell, check the table row
            if (!targetLOV) {
              const tableRow = activeElement.closest(
                'div[class*="grid gap-px text-xs"]'
              );
              if (tableRow) {
                // Find customer column specifically (usually 3rd column)
                const cells = tableRow.querySelectorAll(
                  'div[class*="bg-white border border-gray-300"]'
                );
                if (cells.length >= 3) {
                  targetLOV = findLOVInContainer(cells[2]); // Customer Name column
                }
              }
            }
          }

          // For item fields in sales table
          else if (
            placeholder.includes("item") ||
            inputName === "itemDescription"
          ) {
            // First check the immediate table cell
            const tableCell = activeElement.closest(
              'div[class*="bg-white border border-gray-300"]'
            );
            if (tableCell) {
              targetLOV = findLOVInContainer(tableCell);
            }

            // If not found in cell, check the table row
            if (!targetLOV) {
              const tableRow = activeElement.closest(
                'div[class*="grid gap-px text-xs"]'
              );
              if (tableRow) {
                // Find item description column specifically (usually 6th column)
                const cells = tableRow.querySelectorAll(
                  'div[class*="bg-white border border-gray-300"]'
                );
                if (cells.length >= 6) {
                  targetLOV = findLOVInContainer(cells[5]); // Item Description column
                }
              }
            }
          }

          // Strategy 3: Look in the immediate parent container
          if (!targetLOV) {
            const parentContainer =
              activeElement.closest(".flex") ||
              activeElement.closest('div[class*="items-center"]') ||
              activeElement.closest('div[class*="gap-"]') ||
              activeElement.closest(
                'div[class*="bg-white border border-gray-300"]'
              ) ||
              activeElement.parentElement;

            if (parentContainer) {
              targetLOV = findLOVInContainer(parentContainer);
            }
          }

          // Strategy 4: For table context, find LOV in the same row
          if (!targetLOV) {
            const tableRow = activeElement.closest(
              'div[class*="grid gap-px text-xs"]'
            );
            if (tableRow) {
              // Get all comboboxes in this row and find the closest one
              const rowComboboxes =
                tableRow.querySelectorAll('[role="combobox"]');
              if (rowComboboxes.length > 0) {
                let closestCombobox: HTMLElement | null = null;
                let minDistance = Infinity;

                rowComboboxes.forEach((combo) => {
                  const comboElement = combo as HTMLElement;
                  const rect1 = activeElement.getBoundingClientRect();
                  const rect2 = comboElement.getBoundingClientRect();
                  const distance =
                    Math.abs(rect1.left - rect2.left) +
                    Math.abs(rect1.top - rect2.top);

                  if (distance < minDistance) {
                    minDistance = distance;
                    closestCombobox = comboElement;
                  }
                });

                targetLOV = closestCombobox;
              }
            }
          }

          // Strategy 5: Look for the next/previous sibling that's a combobox
          if (!targetLOV) {
            let sibling = activeElement.nextElementSibling;
            while (sibling && !targetLOV) {
              if (sibling.getAttribute("role") === "combobox") {
                targetLOV = sibling as HTMLElement;
                break;
              }
              targetLOV = sibling.querySelector(
                '[role="combobox"]'
              ) as HTMLElement;
              sibling = sibling.nextElementSibling;
            }

            // Check previous siblings if not found in next siblings
            if (!targetLOV) {
              sibling = activeElement.previousElementSibling;
              while (sibling && !targetLOV) {
                if (sibling.getAttribute("role") === "combobox") {
                  targetLOV = sibling as HTMLElement;
                  break;
                }
                targetLOV = sibling.querySelector(
                  '[role="combobox"]'
                ) as HTMLElement;
                sibling = sibling.previousElementSibling;
              }
            }
          }

          // Strategy 6: Last resort - find closest combobox on the page
          if (!targetLOV) {
            const allComboboxes =
              document.querySelectorAll('[role="combobox"]');
            let closestCombobox: HTMLElement | null = null;
            let minDistance = Infinity;

            allComboboxes.forEach((combo) => {
              const comboElement = combo as HTMLElement;
              const rect1 = activeElement.getBoundingClientRect();
              const rect2 = comboElement.getBoundingClientRect();

              // Calculate distance
              const distance = Math.sqrt(
                Math.pow(rect1.left - rect2.left, 2) +
                  Math.pow(rect1.top - rect2.top, 2)
              );

              // Prefer comboboxes in the same row (similar Y position)
              const sameRow = Math.abs(rect1.top - rect2.top) < 50;
              const adjustedDistance = sameRow ? distance : distance * 2;

              if (adjustedDistance < minDistance && distance < 500) {
                // Within 500px
                minDistance = adjustedDistance;
                closestCombobox = comboElement;
              }
            });

            targetLOV = closestCombobox;
          }

          // Open the target LOV if found
          if (targetLOV) {
            targetLOV.click();
            return;
          }
        }

        console.log(
          "No LOV found for current focus. Please click on a dropdown field first."
        );
      }

      // F11 to open slip search
      if (event.key === "F11") {
        event.preventDefault();
        if (isSearchMode || isEditMode) {
          // If in search mode or edit mode, reset to new form
          resetFormToInitial();
          setIsSearchMode(false);
          setIsEditMode(false);
          setEditingWbId(null);

          // Clear URL parameters and set to new form mode
          const newUrl =
            window.location.pathname +
            "?type=" +
            (onlineMode ? "online" : "offline");
          window.history.replaceState({}, "", newUrl);
        } else {
          // Enter search mode
          const urlParams = new URLSearchParams(window.location.search);
          urlParams.set("search", "true");
          const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
          window.history.replaceState({}, "", newUrl);
          setIsSearchMode(true);
          setFormData((prev) => ({ ...prev, slipNo: "" }));

          // Auto-focus the slip number input after state update
          setTimeout(() => {
            const slipInput = document.querySelector(
              'input[name="slipNo"]'
            ) as HTMLInputElement;
            if (slipInput) {
              slipInput.focus();
              slipInput.select();
            }
          }, 100);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onlineMode, isEditMode, isSearchMode]);

  return (
    <div className="h-screen bg-gray-100 p-1 overflow-hidden relative">
      {/* Weight Display Table - Upper Right Side */}
      <div
        className={`absolute ${isEditMode ? "top-40" : "top-20"} right-2 z-50`}
      >
        <div className="bg-white border-2 border-gray-400 rounded-md shadow-lg w-[350px] mb-6">
          {/* Header Row */}
          <div className="grid grid-cols-3 border-b border-gray-400">
            <div className="bg-gray-200 border-r border-gray-400 p-1 text-center text-sm font-semibold text-black">
              Slip No
            </div>
            <div className="bg-gray-200 border-r border-gray-400 p-1 text-center text-sm font-semibold text-black">
              Vehicle No
            </div>
            <div className="bg-gray-200 p-1 text-center text-sm font-semibold text-black">
              Entry Type
            </div>
          </div>

          {/* Search Row - positioned under headers */}
          <div className="grid grid-cols-3 border-b border-gray-400 bg-blue-50">
<div className="border-r border-gray-400 p-2 w-28 h-12">
              <Input
                placeholder="Search Slip No"
                value={searchSlipNo}
                onChange={(e) => setSearchSlipNo(e.target.value)}
                className="h-5 text-xs text-black placeholder:text-gray-500 bg-white border-gray-300"
              />
            </div>
<div className="border-r border-gray-400 p-2 w-28 h-12">
              <Input
                placeholder="Search Vehicle"
                value={searchVehicleNo}
                onChange={(e) => setSearchVehicleNo(e.target.value)}
                className="h-5 text-xs text-black placeholder:text-gray-500 bg-white border-gray-300"
              />
            </div>
            <div className="p-1">
              <Button
                onClick={() => {
                  setSearchSlipNo("");
                  setSearchVehicleNo("");
                }}
                className="h-5 text-xs bg-gray-500 hover:bg-gray-600 text-white w-full"
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Data Rows - showing filtered records */}
          <div className="max-h-56 overflow-y-auto">
            {filteredRecords && filteredRecords.length > 0 ? (
              filteredRecords.map((record: any, index: number) => (
                <div
                  key={index}
                  className="grid border-b border-gray-400 hover:bg-gray-50 text-xs"
                  style={{ gridTemplateColumns: "116px 115px 1fr" }} // Custom widths
                >
                  {/* Slip No */}
                  <button
className="border-r border-gray-400 p-1 text-center text-blue-600 truncate w-full h-14 text-lg font-bold flex items-center justify-center"
                    onClick={() => {
                      if (!record.wb_id) return;

                      const urlParams = new URLSearchParams(
                        window.location.search
                      );
                      const typeMode = urlParams.get("type") || "online";

                      switch (record.entry_type) {
                        case "PURCHASE":
                          window.location.href = `/purchase-form?type=${typeMode}&edit=${record.wb_id}`;
                          break;

                        case "PURCHASE_RETURN":
                          window.location.href = `/purchase-return?type=${typeMode}&edit=${record.wb_id}`;
                          break;

                        case "SALE_RETURN":
                        case "SALES_RETURN":
                          window.location.href = `/sales-return?type=${typeMode}&edit=${record.wb_id}`;
                          break;

                        case "SOLDNOTE":
                          window.location.href = `/sold-note?type=${typeMode}&edit=${record.wb_id}`;
                          break;

                        default:
                          loadDataByWbId(record.wb_id); // sales entries in same form
                          break;
                      }
                    }}
                  >
                    {record.slip_no || "---"}
                  </button>

                  {/* Vehicle No */}
<div className="border-r border-gray-400 p-3 text-center text-black truncate w-full h-14 text-lg flex items-center justify-center">
                    {record.vehicle_no || "---"}
                  </div>

                  {/* Entry Type */}
                  <div className="p-2 text-center text-blue-600 font-semibold truncate w-full">
                    {record.entry_type || "PURCHASE"}
                  </div>
                </div>
              ))
            ) : (
              <div
                className="grid border-b border-gray-400 text-xs"
                style={{ gridTemplateColumns: "115px 116px 1fr" }}
              >
                <div className="border-r border-gray-400 p-1 text-center text-gray-500 bg-white">
                  {searchSlipNo || searchVehicleNo
                    ? "No matches"
                    : "No records"}
                </div>
                <div className="border-r border-gray-400 p-1 text-center text-gray-500 bg-white">
                  ---
                </div>
                <div className="p-1 text-center text-gray-500 bg-white">
                  ---
                </div>
              </div>
            )}
          </div>

          {/* Load Data Button */}
          {/* <button
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 text-xs"
            onClick={() => window.location.reload()}
          >
            Load Data
          </button> */}
        </div>
      </div>

      {/* Edit Mode Indicator */}
      {isEditMode && (
        <div className="bg-blue-600 text-white p-1 rounded mb-2 text-center text-sm font-medium">
          EDIT MODE: Slip No. {formData.slipNo} (ID: {editingWbId})
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center bg-white border rounded p-1 mb-1">
        <div className="flex gap-1 text-xs">
       {/* Purchase */}
<Button
  className="ml-16 h-7 px-1 text-sm font-medium bg-white text-black border border-black hover:bg-gray-100"
  onClick={() => {
    const urlParams = new URLSearchParams(window.location.search);
    const typeMode = urlParams.get("type") || "online";
    const targetUrl = `/purchase-form?type=${typeMode}`;
    sessionStorage.removeItem("salesFormEditMode");
    window.location.href = targetUrl;
  }}
>
  Purchase
</Button>

{/* Sales */}
<Button
  className={`h-7 px-1 text-sm font-medium border border-black ${
    selectedForm === "sales"
      ? "bg-blue-700 text-white"  // Active
      : "bg-white text-black"     // Inactive
  } ${!showOfflineEntries ? "" : "opacity-50 cursor-not-allowed"}`}
  onClick={() => {
    if (showOfflineEntries) return; // Disabled state check
    setSelectedForm("sales"); // Mark as active
    const urlParams = new URLSearchParams(window.location.search);
    const typeMode = urlParams.get("type") || "online";
    const targetUrl = `/sales-form?type=${typeMode}`;
    sessionStorage.removeItem("salesFormEditMode");
    window.location.href = targetUrl;
  }}
>
  Sales
</Button>


{/* Sales Return */}
<Button
  className="h-7 px-1 text-sm font-medium bg-white text-black border border-black hover:bg-gray-100"
  onClick={() => {
    // 🔒 ALWAYS FORCE OFFLINE FOR SALE RETURN
    const targetUrl = `/sales-return?type=online`;
    window.location.href = targetUrl;
  }}
>
  Sales Return
</Button>

{/* Sold Note */}
<Button
  className="h-7 px-1 text-sm font-medium bg-white text-black border border-black hover:bg-gray-100"
  onClick={() => {
    const urlParams = new URLSearchParams(window.location.search);
    const typeMode = urlParams.get("type") || "online";
    const targetUrl = `/sold-note?type=${typeMode}`;
    window.location.href = targetUrl;
  }}
>
  Sold Note
</Button>

          {/* <Button
            className="h-7 px-1 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => toggleOnlineMode(false)}
          >
            Offline
          </Button>
          <Button
            className="h-7 px-1 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={navigateToFirst}
          >
            First
          </Button> */}
          <Button
            className="h-7 px-1 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium"
            onClick={navigateToPrev}
          >
            Prev
          </Button>
          <Button
            className="h-7 px-1 text-sm bg-cyan-600 hover:bg-cyan-700 text-white font-medium"
            onClick={navigateToNext}
          >
            Next
          </Button>
          {/* <Button
            className="h-7 px-1 text-sm bg-teal-600 hover:bg-teal-700 text-white font-medium"
            onClick={navigateToLast}
          >
            Last
          </Button> */}
          <div className="flex gap-5">
  <Button
    type="button"
    className="bg-green-600 hover:bg-green-700 h-10 w-40 px-4 text-sm text-white font-medium"
    onClick={() => {
      console.log("🟢 Save button clicked");
      handleSave();
    }}
    disabled={loading || disableSaveButton}
  >
    {loading ? "Saving..." : "Save"}
  </Button>

  <Button
    className="h-7 px-1 text-sm bg-orange-600 hover:bg-orange-700 text-white font-medium"
    onClick={handlePrintReport}
  >
    Print
  </Button>
</div>




 {/* {isEditMode && (
            <Button
              className="h-7 px-1 text-sm bg-red-600 hover:bg-red-700 text-white font-medium"
              onClick={cancelEdit}
            >
              Cancel
            </Button>
          )} */}
          {/* <Button
            className="h-7 px-1 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium"
            onClick={() => {
              if (isSearchMode || isEditMode) {
                // If in search mode or edit mode, reset to new form
                resetFormToInitial();
                setIsSearchMode(false);
                setIsEditMode(false);
                setEditingWbId(null);

                // Clear URL parameters and set to new form mode
                const newUrl =
                  window.location.pathname +
                  "?type=" +
                  (onlineMode ? "online" : "offline");
                window.history.replaceState({}, "", newUrl);
              } else {
                // Enter search mode
                const urlParams = new URLSearchParams(window.location.search);
                urlParams.set("search", "true");
                const newUrl = `${
                  window.location.pathname
                }?${urlParams.toString()}`;
                window.history.replaceState({}, "", newUrl);
                setIsSearchMode(true);
                setFormData((prev) => ({ ...prev, slipNo: "" }));
              }
            }}
          >
            {isSearchMode || isEditMode ? "New" : "Edit"}
          </Button> */}



<Button
  className={`ml-14 h-7 px-2 text-sm font-medium text-white ${
    onlineMode && formData.firstWeight && formData.secondWeight
      ? "bg-gray-400 cursor-not-allowed"
      : "bg-blue-600 hover:bg-blue-700"
  }`}
  onClick={() => handleReject(editingWbId as number)}

   disabled={Boolean(
    onlineMode &&
    formData.firstWeight &&
    formData.secondWeight
  )}
>
  Reject
</Button>
 

        </div>

         <div className="flex items-center gap-3">
                  {/* Weight Display - bigger and aligned left */}
                  <div className="mr-[-5rem] transform scale-150">
                    <WeightIndicator comPort={comPort} compact={true} />
                  </div>
        
                  {/* Buttons */}
                  <div className="flex gap-1 ml-28">
                    <button
                      className={`h-8 px-2 text-sm font-medium rounded transition-colors ${
                        onlineMode === true
                          ? "bg-green-500 hover:bg-green-600 text-white"
                          : "bg-gray-300 hover:bg-gray-400 text-gray-600"
                      }`}
                      onClick={() => toggleOnlineMode(true)}
                    >
                      ONLINE
                    </button>
        
                    <button
                      className={`h-8 px-2 text-sm font-medium rounded transition-colors ${
                        onlineMode === false
                          ? "bg-red-500 hover:bg-red-600 text-white"
                          : "bg-gray-300 hover:bg-gray-400 text-gray-600"
                      }`}
                      onClick={() => toggleOnlineMode(false)}
                    >
                      OFFLINE
                    </button>
                  </div>
                </div>
              </div>
      {/* ===== MAIN FORM LAYOUT SECTION ===== */}
      {/* Main Form Layout - 100% visible without scrolling */}
      <div className="bg-white p-1 rounded border h-[calc(100vh-60px)] overflow-hidden">
        <div className="grid grid-cols-12 gap-1 h-full">
          {/* ===== LEFT SIDE - MAIN FORM AREA (COLUMNS 1-8) ===== */}
          <div className="col-span-8">
            {/* ===== MASTER TABLE SECTION - BASIC SLIP INFORMATION ===== */}
            <div className="bg-gray-300 p-1 rounded border mb-4 w-full">
              <div className="grid grid-cols-9 gap-2">
                {/* ===== COLUMN 1 - LEFT FORM FIELDS SECTION ===== */}
                <div className="col-span-3 flex flex-col gap-2 items-start">
                  {/* ===== SLIP NUMBER FIELD ===== */}
                  <div className="flex items-center gap-1">
                    <Label className="text-xs text-black w-20">Slip No</Label>
                    {isSearchMode ? (
                      <div className="flex gap-1 w-40">
                        <Input
                          name="slipNo"
                          value={formData.slipNo}
                          onChange={handleChange}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              searchAndLoadBySlipNo();
                            }
                          }}
                          placeholder="Enter slip number to search"
                          className="h-7 text-xs text-black flex-1"
                        />
                        <Button
                          onClick={searchAndLoadBySlipNo}
                          className="h-7 px-1 text-xs bg-green-600 hover:bg-green-700 text-white"
                          disabled={loading}
                        >
                          {loading ? "..." : "Search"}
                        </Button>
                      </div>
                    ) : (
                      <Input
                        name="slipNo"
                        value={formData.slipNo}
                        readOnly
                      className="h-7 text-xs text-black w-36 
           !border !border-gray-400 rounded px-1 
           focus:!border-black"
                      />
                    )}
                  </div>




                  {/* Net Weight */}
                  <div className="flex items-center gap-1">
                    <Label className="text-xs text-black w-20">
                      Net Weight
                    </Label>
                    <Input
                      name="netWeight"
                      value={formData.netWeight}
                      onChange={handleChange}  onChange={handleChange}
                        readOnly
                    className="h-7 text-xs bg-yellow-200 text-black w-36 
           !border !border-gray-400 rounded px-1 
           focus:!border-black"
                    />
                  </div>


{/* ------------------------------------ */}




                  {/* Freight */}
<div className="flex items-center gap-1">
  <Label className="text-xs text-black w-20">Freight</Label>
  <Input
    autoComplete="off"
    name="freight"
    value={formData.freight || ""}
    onChange={handleChange}
    className="h-7 text-xs bg-yellow-200 text-black w-36 
           !border !border-gray-400 rounded px-1 
           focus:!border-black"
placeholder="Auto-calculated"
  />
</div>




{/* ------------------------------- */}







                  {/* Remarks */}
                  <div className="flex items-start gap-1">
                    <Label className="text-xs text-black w-20 mt-1">
                      Remarks
                    </Label>
                    <Textarea
                      placeholder="Add remarks"
                      name="remarks"
                      value={formData.remarks}
                      onChange={handleChange}
                     className="h-20 text-xs resize-none text-black placeholder:text-gray-500 w-36 
           !border !border-gray-400 rounded px-1 
           focus:!border-black"
                    />
                  </div>
                  {/* <div className="flex items-center gap-2">
                    <Label className="text-xs text-black w-20 mt-1">
                      Slip Out Time
                    </Label>
                    <Input
                      type="text"
                      name="slipOutTime"
                      value={formData.slipOutTime || ""}
                      onChange={handleChange}
                      //placeholder="YYYY-MM-DD HH:mm:ss"
                      className="h-7 text-xs text-black w-36"
                    />
                  </div> */}
                </div>

                {/* ===== COLUMN 2 - WEIGHT MEASUREMENT FIELDS SECTION ===== */}
                <div className="col-span-3 flex flex-col gap-2 items-start">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-black w-24">
                      First Weight
                    </Label>
                    <Input
                      autoComplete="off"
                      name="firstWeight"
                      value={formData.firstWeight}
                      onChange={handleChange}
                       readOnly
                    className={`h-7 text-xs text-black w-36 
  !border !border-gray-400 rounded px-1 
  focus:!border-black
  ${isEditMode ? "bg-gray-100" : ""}
`}
                      // readOnly={isEditMode}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-black w-24">
                     Second Weight
                    </Label>
                    <Input
                      autoComplete="off"
                      name="secondWeight"
                      value={formData.secondWeight}
                      onChange={handleChange}
                       readOnly
                    className={`h-7 text-xs w-36 text-black 
  !border !border-gray-400 rounded px-1 
  focus:!border-black
  ${
    isEditMode && formData.secondWeight
      ? "bg-gray-100 cursor-not-allowed"
      : ""
  }
`}
                      //readOnly={isEditMode && !!formData.secondWeight}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-black w-24">
                      Bardana Weight
                    </Label>
                    <Input
                      autoComplete="off"
                      name="bardanaWeight"
                      value={formData.bardanaWeight}
                      readOnly
                      onChange={handleChange}
                     className="h-7 text-xs text-black w-36 
           !border !border-gray-400 rounded px-1 
           focus:!border-black"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-black w-24">
                      Gross Weight
                    </Label>
                    <Input
                      autoComplete="off"
                      name="grossWeight"
                      value={formData.grossWeight}
                      readOnly
                     className="h-7 text-xs text-black w-36 
           !border !border-gray-400 rounded px-1 
           focus:!border-black"
                    />
                  </div>
                    <div className="flex items-center gap-2">
                                      <Label className="text-xs text-black w-24">Branch</Label>
                                      {isEditMode ? (
                                        <Input
                                          value={
                                            branches.find(
                                              (b) =>
                                                b.branch_id.toString() ===
                                                formData.branchId?.toString()
                                            )?.branch_name ||
                                            formData.branch ||
                                            ""
                                          }
                                          readOnly
                                          className="h-8 text-xs text-black bg-gray-100 w-32"
                                        />
                                      ) : (
                                        <Select
                                          name="branch"
                                          value={formData.branchId} 
                                        onValueChange={(value) => {
  console.log("Branch changed to:", value);
  
  setFormData((prev) => ({
    ...prev,
    branchId: value, 
    branch: branches.find((b) => b.branch_id.toString() === value)?.branch_name || "",
  }));
}}
                                        >
                                          <SelectTrigger className="h-8 text-xs text-black w-32 
           !border !border-gray-400 rounded px-1 
           focus:!border-black">
                                            <SelectValue
                                              placeholder="Select branch"
                                              className="text-black"
                                            />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {branches.map((branch) => (
                                              <SelectItem
                                                key={branch.branch_id}
                                                value={branch.branch_id.toString()} // ✅ id hi value hogi
                                              >
                                                {branch.branch_name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      )}
                                    </div>
                </div>

                {/* ===== COLUMN 3 - DRIVER INFO & CAMERA CONTROLS SECTION ===== */}
                <div className="col-span-3 flex flex-col justify-between">
                  <div className="flex flex-col gap-1">
                    {/* Driver Name */}
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-black w-20">
                        Driver Name
                      </Label>
                      <Input
                        autoComplete="off"
                        placeholder="Enter driver name"
                        name="driverName"
                        value={formData.driverName}
                        onChange={handleChange}
                       className="h-8 text-xs text-black w-32 
           !border !border-gray-400 rounded px-1 
           focus:!border-black"
                      />
                    </div>
                  </div>

                  {/* Buttons & Camera Feed */}
                  <div className="flex flex-col gap-1 mt-2">
                    <div className="grid grid-cols-2 gap-1 mb-2">
                         {/* Slight space below */}
                    <Button
                      className={`h-7 text-xs ${
                        formData.isFirstWeightSaved ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                      }`}
                      onClick={captureFirstWeight}
                     // disabled={formData.isFirstWeightSaved}
                    >
                      1st WHT
                    </Button>
                    
                   {/* 2nd Weight Button */}
 <Button
  className={`h-7 text-xs ${
    (!isEditMode && !formData.isFirstWeightSaved) || formData.isSecondWeightSaved
      ? "bg-gray-400 cursor-not-allowed"
      : "bg-green-600 hover:bg-green-700"
  }`}
  onClick={captureSecondWeight}
  disabled={!isEditMode && !formData.isFirstWeightSaved || formData.isSecondWeightSaved}
>
  2nd WHT
</Button>
                    </div>

                    <div className="h-28 w-full overflow-hidden mb-1 rounded border">
                      <VideoStreamFullscreen
                        camera={{
                          id: 1,
                          name: "Camera 01",
                          ip: cameraIp,
                          port: cameraPort,
                        }}
                        isConnected={true}
                        isStreaming={true}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-1">
                      <Button
                        className="h-7 bg-yellow-500 text-xs"
                        onClick={resetForm}
                      >
                        Clear
                      </Button>
                      <Button className="h-7 bg-red-500 text-xs">Exit</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== SALES MODE INDICATOR SECTION ===== */}
            <div className="text-center py-1 gap-0 mt-[-0.9rem]">
              <div
                className={`inline-block px-1 py-1 rounded-lg shadow-md ${
                  onlineMode === true
                    ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
                    : "bg-gradient-to-r from-red-500 to-red-600 text-white"
                }`}
              >
                <h2 className="text-xl font-bold tracking-wide">
                  {onlineMode === true ? "Sale Online" : "Sale Offline"}
                </h2>
              </div>
            </div>

            {/* Top buttons row - above details section */}
            <div className="flex gap-1 mb-0">
              <Button
                className="h-7 text-xs px-1 bg-gray-300 text-black"
                onClick={() => {
                  // Always navigate to new purchase form
                  const urlParams = new URLSearchParams(window.location.search);
                  const typeMode = urlParams.get("type") || "online";
                  const targetUrl = `/purchase-form?type=${typeMode}`;
                  // Clear any edit state and force navigation
                  sessionStorage.removeItem("salesFormEditMode");
                  window.location.href = targetUrl;
                }}
              >
                Purchase
              </Button>
              <Button
                className={`h-7 text-xs px-1 ${
                  !showOfflineEntries
                    ? "bg-blue-600 text-white"
                    : "bg-gray-300 text-black"
                }`}
                onClick={() => {
                  // Always navigate to new sales form
                  const urlParams = new URLSearchParams(window.location.search);
                  const typeMode = urlParams.get("type") || "online";
                  const targetUrl = `/sales-form?type=${typeMode}`;
                  // Clear any edit state and force navigation
                  sessionStorage.removeItem("salesFormEditMode");
                  window.location.href = targetUrl;
                }}
              >
                Sales
              </Button>
              <Button
                className={`h-7 text-xs px-1 ${
                  showOfflineEntries
                    ? "bg-blue-600 text-white"
                    : "bg-gray-300 text-black"
                }`}
                onClick={() => setShowOfflineEntries(!showOfflineEntries)}
              >
                Offline
              </Button>
            </div>

            {/* ===== SALES DETAILS DATA ENTRY SECTION ===== */}
            <div className="bg-gray-300 p-1 rounded border w-[1000px] ">
              {showOfflineEntries ? (
                /* ===== OFFLINE ENTRIES TABLE DISPLAY ===== */
                <div className="h-full flex flex-col">
                  <h3 className="text-lg font-semibold mb-2 text-black">
                    Sale Offline Entries
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-1 text-left border border-black text-black">
                            Slip No
                          </th>
                          <th className="px-2 py-1 text-left border border-black text-black">
                            Slip Date
                          </th>
                          <th className="px-2 py-1 text-left border border-black text-black">
                            Entry Type
                          </th>
                          <th className="px-2 py-1 text-left border border-black text-black">
                            First Weight
                          </th>
                          <th className="px-2 py-1 text-left border border-black text-black">
                            Second Weight
                          </th>
                          <th className="px-2 py-1 text-left border border-black text-black">
                            Vehicle No
                          </th>
                          <th className="px-2 py-1 text-left border border-black text-black">
                            Company Name
                          </th>
                          <th className="px-2 py-1 text-left border border-black text-black">
                            Manual Trans #
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecords && filteredRecords.length > 0 ? (
                          filteredRecords.map((record: any, index: number) => (
                            <tr
                              key={record.wb_id || index}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-2 py-1 border border-black text-black">
                                <button
                                  className="text-blue-600 hover:text-blue-800 font-medium underline"
                                  onClick={() => {
                                    console.log(
                                      "Clicked offline record:",
                                      record
                                    );
                                    if (record.wb_id) {
                                      // Check if this is an offline entry
                                      const isOfflineEntry =
                                        record.offline_entry === "Yes";

                                      // Determine the correct mode parameter
                                      const modeParam = isOfflineEntry
                                        ? "offline"
                                        : "online";

                                      if (record.entry_type === "PURCHASE") {
                                        // Navigate to purchase form
                                        const targetUrl = `/purchase-form?form=purchase&type=${modeParam}&edit=${record.wb_id}`;
                                        console.log(
                                          "Navigating to purchase form:",
                                          targetUrl
                                        );
                                        window.location.href = targetUrl;
                                      } else if (
                                        record.entry_type === "PURCHASE_RETURN"
                                      ) {
                                        const targetUrl = `/purchase-return?type=${modeParam}&edit=${record.wb_id}`;
                                        console.log(
                                          "Navigating to purchase return form:",
                                          targetUrl
                                        );
                                        window.location.href = targetUrl;
                                      } else if (
                                        record.entry_type === "SALE_RETURN"
                                      ) {
                                        const targetUrl = `/sales-return?type=${modeParam}&edit=${record.wb_id}`;
                                        console.log(
                                          "Navigating to sales return form:",
                                          targetUrl
                                        );
                                        window.location.href = targetUrl;
                                      } else {
                                        // For SALE entries, stay on current page and load the data
                                        loadDataByWbId(record.wb_id);

                                        // Update URL to show edit mode with correct type
                                        const newUrl = `/sales-form?type=${modeParam}&edit=${record.wb_id}`;
                                        window.history.replaceState(
                                          {},
                                          "",
                                          newUrl
                                        );

                                        // Close offline entries view
                                        setShowOfflineEntries(false);
                                      }
                                    }
                                  }}
                                >
                                  {record.slip_no || "---"}
                                </button>
                              </td>
                              <td className="px-4 py-2 border border-black text-black">
                                {record.slip_in_time
                                  ? new Date(
                                      record.slip_in_time
                                    ).toLocaleDateString()
                                  : "---"}
                              </td>
                              <td className="px-2 py-1 border border-black text-black">
                                {record.entry_type || "SALE"}
                              </td>
                              <td className="px-2 py-1 border border-black text-black">
                                ---
                              </td>
                              <td className="px-2 py-1 border border-black text-black">
                                ---
                              </td>
                              <td className="px-2 py-1 border border-black text-black">
                                {record.vehicle_no || "---"}
                              </td>
                              <td className="px-2 py-1 border border-black text-black">
                                {record.vendor_name || "---"}
                              </td>
                              <td className="px-2 py-1 border border-black text-black">
                                ---
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={8}
                              className="px-2 py-4 text-center text-gray-500 border border-black"
                            >
                              No offline entries found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* ===== REGULAR SALES FORM - DATA ENTRY TABLE ===== */
                <div className="h-full flex flex-col">
                  {/* ===== SALES TABLE HEADER - WITH DELETE ACTION COLUMN ===== */}
                  <div
                    className="grid gap-px bg-gray-250 text-xs font-semibold mb-1 w-[1700px]"
                    style={{
                      gridTemplateColumns:
                        "80px 80px 170px  120px 110px 170px 60px 60px 90px 40px", // Added extra 100px for DC ID
                      width: "1800px", // adjust width
                    }}
                  >
                    <div className="bg-gray-300 p-1 text-center border border-gray-400 text-black">
                      DC #
                    </div>
                    {/* <div className="bg-blue-100 p-1 text-center border border-gray-400 text-black">
      DC ID
    </div> */}
                    <div className="bg-gray-300 p-1 text-center border border-gray-400 text-black">
                      DO #
                    </div>
                    <div className="bg-gray-300 p-1 text-center border border-gray-400 text-black">
                      Customer Name
                    </div>
                     {/* <div className="bg-blue-100 p-1 text-center border border-gray-400 text-black">
      Customer ID
    </div>  */}
                    <div className="bg-gray-300 p-1 text-center border border-gray-400 text-black">
                      Vehicle No
                    </div>
                    <div className="bg-gray-300 p-1 text-center border border-gray-400 text-black">
                      Do Date
                    </div>
                    <div className="bg-gray-300 p-1 text-center border border-gray-400 text-black">
                      Item Description
                    </div>
                    <div className="bg-gray-300 p-1 text-center border border-gray-400 text-black">
                      DC Qty
                    </div>
                    <div className="bg-gray-300 p-1 text-center border border-gray-400 text-black">
                      DO Qty
                    </div>
                    <div className="bg-gray-300 p-1 text-center border border-gray-400 text-black">
                      Branch
                    </div>
                    <div className="bg-gray-300 p-1 text-center border border-gray-400 text-black">
                      ✖
                    </div>
                  </div>

                  {/* Sales Table Body */}
                  <div className="bg-gray-200 mb-4" style={{ height: "200px" }}>
                    {[...Array(8)].map((_, index) => (
                      <div
                        key={index}
                        className="grid gap-px text-xs"
                        style={{
                          gridTemplateColumns:
                            "80px 80px 170px 120px 110px 170px 60px 60px 90px 40px", // adjust for DC ID
                          width: "1500px",
                        }}
                      >




{/* DC # */}
<div className="bg-white border border-gray-300 p-1">
  <input
    type="text"
    className={`w-full h-6 text-xs text-black px-2 border-none bg-transparent focus:outline-none ${
      (!onlineMode || salesData[index]?.isFetched)
        ? "bg-gray-100 cursor-not-allowed"
        : ""
    }`}
    value={salesData[index]?.dcNo || ""}
    onChange={(e) =>
      handleSalesDataChange(index, "dcNo", e.target.value)
    }
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const dcNo = salesData[index]?.dcNo;
        if (dcNo && dcNo.trim() !== "") {
          fetchDcData(dcNo.trim(), index);
        }
      }
    }}
    placeholder={!onlineMode || salesData[index]?.isFetched ? "" : "Press Enter to fetch"}
    readOnly={!onlineMode || salesData[index]?.isFetched} // ✅ dynamic based on onlineMode + fetched
    autoComplete="off"
    autoCorrect="off"
    autoCapitalize="off"
    spellCheck="false"
    data-form-type="other"
  />
</div>



                        {/* DC ID
        <div className="bg-white border border-gray-300 p-1">
          <input
            type="text"
            className="w-full h-6 text-xs text-black px-2 border-none bg-transparent focus:outline-none"
            value={salesData[index]?.dcId || ""}
            onChange={(e) =>
              handleSalesDataChange(index, "dcId", e.target.value)
            }
            readOnly={true} // DC ID should be fetched, not editable
            autoComplete="off"
          />
        </div> */}

   {/* DO Number Input */}
<div className="bg-white border border-gray-300 p-1">
  <input
    type="text"
    className={`w-full h-6 text-xs text-black px-2 border-none bg-transparent focus:outline-none ${
      onlineMode ? "bg-gray-100 cursor-not-allowed" : ""
    }`}
    value={salesData[index]?.doNo || ""}
    onChange={(e) =>
      handleSalesDataChange(index, "doNo", e.target.value)
    }
    readOnly={onlineMode} // ✅ now non-editable in online mode regardless of value
    autoComplete="off"
    autoCorrect="off"
    autoCapitalize="off"
    spellCheck="false"
    data-form-type="other"
  />
</div>






{/* Customer Name LOV */}
<div className="bg-white border border-gray-300 p-1 relative">
  <input
    type="text"
    className={`w-full h-6 text-xs border-none bg-white text-black cursor-text px-2 ${
      salesData[index]?.customerId ? "bg-blue-100" : "bg-white"
    }`}
    value={salesData[index]?.customerName || ""}
    onFocus={() => {
      console.log("👉 Customer field focused, row:", index);
      console.log("Current customer in row:", {
        name: salesData[index]?.customerName,
        id: salesData[index]?.customerId
      });
      console.log("Available customers:", customers?.length);
      
      setFocusedCustomerRowIndex(index);
      setOpenBranchLovRowIndex(null);
      setOpenItemLovRowIndex(null);
      
      // Only open LOV if user explicitly wants it (via Ctrl+L or button click)
      // Don't auto-open on focus
    }}
    onChange={(e) => {
      console.log("📝 Customer input changed:", e.target.value);
      const newData = [...salesData];
      newData[index] = { 
        ...newData[index], 
        customerName: e.target.value.toUpperCase(), 
        customerId: null // Clear ID when typing manually
      };
      setSalesData(newData);
      
      // Update search query for LOV if it's open
      if (openCustomerLovRowIndex === index) {
        setCustomerSearchQuery(e.target.value);
      }
    }}
    onKeyDown={(e) => {
      // Open LOV with Ctrl+L
      if ((e.ctrlKey && e.key.toLowerCase() === "l") && index === focusedCustomerRowIndex) {
        e.preventDefault();
        setOpenCustomerLovRowIndex(index);
        setCustomerSearchQuery(salesData[index]?.customerName || "");
        setHighlightedCustomerIndex(0);
        setTimeout(() => {
          if (customerSearchInputRef.current) {
            customerSearchInputRef.current.focus();
          }
        }, 50);
      }

      // Clear selected customer
      if (salesData[index]?.customerId && e.key === "Backspace") {
        e.preventDefault();
        const newData = [...salesData];
        newData[index] = { ...newData[index], customerName: "", customerId: null };
        setSalesData(newData);
        return;
      }

      // Navigate dropdown
      if (openCustomerLovRowIndex === index && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault();
        setHighlightedCustomerIndex(prev => {
          if (e.key === "ArrowDown") return prev === filteredCustomers.length - 1 ? 0 : prev + 1;
          return prev <= 0 ? filteredCustomers.length - 1 : prev - 1;
        });
      }

      // Select highlighted customer with Enter (only if LOV is open)
      if (openCustomerLovRowIndex === index && e.key === "Enter" && filteredCustomers.length > 0) {
        e.preventDefault();
        const highlightedCustomer = filteredCustomers[highlightedCustomerIndex];
        if (highlightedCustomer) {
          const customerId = highlightedCustomer.customer_id || highlightedCustomer.id;
          const customerName = highlightedCustomer.name || highlightedCustomer.customer_name;
          
          console.log("🎯 Selecting customer with Enter:", { customerName, customerId });
          
          const newData = [...salesData];
          newData[index] = {
            ...newData[index],
            customerName: customerName,
            customerId: customerId
          };
          setSalesData(newData);
          setOpenCustomerLovRowIndex(null);
          setCustomerSearchQuery("");
        }
      }

      if (e.key === "Escape") {
        setOpenCustomerLovRowIndex(null);
        setHighlightedCustomerIndex(-1);
      }
    }}
    autoComplete="off"
  />

  {/* LOV Open Button */}
  <button
    className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-600"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Toggle LOV
      if (openCustomerLovRowIndex === index) {
        setOpenCustomerLovRowIndex(null);
      } else {
        setOpenCustomerLovRowIndex(index);
        setCustomerSearchQuery(salesData[index]?.customerName || "");
        setHighlightedCustomerIndex(0);
        setTimeout(() => {
          if (customerSearchInputRef.current) {
            customerSearchInputRef.current.focus();
          }
        }, 50);
      }
    }}
    title="Open LOV (Ctrl+L)"
  >
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  </button>

  {/* Customer LOV Dropdown */}
  {openCustomerLovRowIndex === index && (
    <div
      ref={customerLovRef}
      className="absolute z-50 bg-white border border-gray-300 mt-1 w-full shadow-md max-h-48 overflow-y-auto"
      onMouseDown={(e) => e.preventDefault()} // Prevent input blur on dropdown click
    >
      <input
        ref={customerSearchInputRef}
        type="text"
        placeholder="Search customers..."
        value={customerSearchQuery}
        onChange={(e) => setCustomerSearchQuery(e.target.value)}
        className="h-7 w-full text-black text-sm border border-gray-300 px-2 m-1 rounded"
        autoFocus
        onKeyDown={(e) => {
          // Arrow navigation
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedCustomerIndex(prev => {
              if (e.key === "ArrowDown") return prev === filteredCustomers.length - 1 ? 0 : prev + 1;
              return prev <= 0 ? filteredCustomers.length - 1 : prev - 1;
            });
          }

          // ENTER SELECT FIX
          if (e.key === "Enter" && filteredCustomers.length > 0) {
            e.preventDefault();

            const selectedCustomer = filteredCustomers[highlightedCustomerIndex];

            if (selectedCustomer) {
              const customerId = selectedCustomer.customer_id || selectedCustomer.id;
              const customerName = selectedCustomer.name || selectedCustomer.customer_name;

              const newSalesData = [...salesData];
              newSalesData[index] = {
                ...newSalesData[index],
                customerName: customerName,
                customerId: customerId
              };

              setSalesData(newSalesData);
              setOpenCustomerLovRowIndex(null);
              setCustomerSearchQuery("");
            }
          }

          // Escape to close dropdown
          if (e.key === "Escape") {
            e.preventDefault();
            setOpenCustomerLovRowIndex(null);
            setHighlightedCustomerIndex(-1);
          }
        }}
      />

      <div>
        {filteredCustomers.length > 0 ? (
          filteredCustomers.map((customer, idx) => {
            // Normalize the customer data
            const customerId = customer.customer_id || customer.id;
            const customerName = customer.name || customer.customer_name;
            
            return (
              <div
                key={customerId}
                className={`px-3 py-2 text-xs cursor-pointer hover:bg-blue-50 text-black ${
                  idx === highlightedCustomerIndex ? 'bg-blue-100' : ''
                }`}
                onClick={() => {
                  console.log("🎯 Customer clicked:", { customerName, customerId, rowIndex: index });
                  
                  const newSalesData = JSON.parse(JSON.stringify(salesData));
                  newSalesData[index] = {
                    ...newSalesData[index],
                    customerName: customerName,
                    customerId: customerId
                  };
                  
                  setSalesData(newSalesData);
                  setOpenCustomerLovRowIndex(null);
                  setCustomerSearchQuery("");
                  
                  setTimeout(() => {
                    console.log("🔄 After selection - Customer in salesData:", newSalesData[index]?.customerName);
                    console.log("🔄 After selection - Customer ID in salesData:", newSalesData[index]?.customerId);
                    
                    if (details && details[index]) {
                      const newDetails = [...details];
                      newDetails[index] = {
                        ...newDetails[index],
                        customerName: customerName,
                        customerId: customerId
                      };
                      setdetails(newDetails);
                      console.log("🔄 Also updated details state");
                    }
                  }, 0);
                }}
                onMouseEnter={() => setHighlightedCustomerIndex(idx)}
              >
                <div className="font-medium">{customerName}</div>
                {customer.code && (
                  <div className="text-xs text-gray-500">Code: {customer.code}</div>
                )}
              </div>
            );
          })
        ) : (
          <div className="px-3 py-2 text-xs text-gray-500 text-center">
            No customers found
          </div>
        )}
      </div>
    </div>
  )}
</div>









                       <div className="bg-white border border-gray-300 p-1">
  <input
    type="text"
    className={`w-full h-6 text-xs text-black px-2 border-none bg-transparent focus:outline-none ${
      (onlineMode && salesData[index]?.isFetched) ? "bg-gray-100 cursor-not-allowed" : ""
    }`}
    value={salesData[index]?.vehicleNo || ""}
    onChange={(e) => {
      if (onlineMode && salesData[index]?.isFetched) return; // ❌ prevent editing if fetched
      handleSalesDataChange(index, "vehicleNo", e.target.value);
    }}
    autoComplete="off"
    autoCorrect="off"
    autoCapitalize="off"
    spellCheck="false"
    readOnly={onlineMode && salesData[index]?.isFetched} // ✅ fully controlled
    data-form-type="other"
  />
</div>



<div className="bg-white border border-gray-300 p-1">
  {!onlineMode && salesData[index]?.doNo ? (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="w-full h-6 text-xs text-left px-2 border-none bg-transparent focus:outline-none flex items-center justify-between text-black"
          onClick={() => {
            const today = new Date().toISOString().split("T")[0];
            // ✅ Ensure date is set on click
            if (!salesData[index]?.doDate || salesData[index]?.doDate.trim() === "") {
              console.log("📅 Setting default date for row", index, ":", today);
              handleSalesDataChange(index, "doDate", today);
            }
          }}
        >
          <span className="text-black">
            {
              // ✅ Auto-set current date in render if empty
              salesData[index]?.doDate && salesData[index]?.doDate.trim() !== ""
                ? new Date(salesData[index].doDate).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                : (() => {
                    const today = new Date().toISOString().split("T")[0];
                    handleSalesDataChange(index, "doDate", today);
                    return new Date(today).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    });
                  })()
            }
          </span>
          <CalendarIcon className="h-3 w-3 text-black" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 bg-white border border-black"
        align="start"
      >
        <Calendar
          mode="single"
          selected={
            salesData[index]?.doDate
              ? new Date(salesData[index].doDate)
              : new Date()
          }
          onSelect={(date) => {
            if (date) {
              handleSalesDataChange(
                index,
                "doDate",
                date.toISOString().split("T")[0]
              );
            }
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  ) : (
    <input
      type="text"
      className="w-full h-6 text-xs text-black px-2 border-none bg-transparent focus:outline-none"
      value={
        salesData[index]?.doDate
          ? new Date(salesData[index].doDate).toLocaleDateString("en-GB")
          : ""
      }
      readOnly
      placeholder=""
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck="false"
      data-form-type="other"
      onFocus={() => {
        // ✅ Auto-set date when focused
        if (!onlineMode && salesData[index]?.doNo && 
            (!salesData[index]?.doDate || salesData[index]?.doDate.trim() === "")) {
          const today = new Date().toISOString().split("T")[0];
          console.log("📅 Auto-setting date on focus:", today);
          handleSalesDataChange(index, "doDate", today);
        }
      }}
    />
  )}
</div>










<div className="bg-white border border-gray-300 p-1">
  {/* Show dropdown only in OFFLINE mode */}
  {!onlineMode ? (
    <Select
      value={salesData[index]?.itemId?.toString() || "__CUSTOM__"}
      onValueChange={(idStr) => {
        if (idStr === "__CUSTOM__") return;
        const id = parseInt(idStr, 10);
        const selectedItem = items.find((i) => i.id === id);
        if (selectedItem) {
          handleSalesDataChange(index, "itemId", selectedItem.id);
          handleSalesDataChange(index, "itemCode", selectedItem.item_code || selectedItem.code || "");
          handleSalesDataChange(index, "itemDescription", selectedItem.description || selectedItem.item_desc || "");
        }
        setItemSearchQuery("");
      }}
      onOpenChange={(open) => {
        if (open) {
          setTimeout(() => itemSearchInputRef.current?.focus(), 0);
        } else {
          setItemSearchQuery("");
        }
      }}
    >
      <SelectTrigger 
        className="w-full h-6 text-xs border-none bg-transparent focus:ring-0 text-black"
      >
        <div className="flex items-center justify-between w-full">
          <SelectValue placeholder="Select or type new item">
            {salesData[index]?.itemDescription || ""}
          </SelectValue>
        </div>
      </SelectTrigger>

      <SelectContent>
        <div className="px-2 py-1 sticky top-0 bg-white z-10">
          <input
            ref={itemSearchInputRef}
            type="text"
            placeholder="Search or type new item..."
            value={itemSearchQuery || salesData[index]?.itemDescription || ""}
            onChange={(e) => {
              const val = e.target.value;
              setItemSearchQuery(val);
              handleSalesDataChange(index, "itemDescription", val);
              handleSalesDataChange(index, "itemId", null);
              setTimeout(() => {
                itemSearchInputRef.current?.focus();
                itemSearchInputRef.current?.setSelectionRange(val.length, val.length);
              }, 0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (itemSearchQuery || "").trim() !== "") {
                e.preventDefault();
                handleSalesDataChange(index, "itemDescription", itemSearchQuery);
                handleSalesDataChange(index, "itemId", null);
                setItemSearchQuery("");
              }
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="h-8 w-full text-sm border border-gray-300 px-3 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            autoComplete="off"
          />
        </div>
{filteredItems
  .filter(item => item?.id != null)
  .map(item => (
    <SelectItem
      key={item.id}
      value={item.id.toString()}
      className="text-xs focus:bg-blue-500 focus:text-white data-[state=checked]:bg-blue-500 data-[state=checked]:text-white"
>
      {item.description || item.item_desc}
    </SelectItem>
  ))}

      {itemSearchQuery &&
  !items.some((i) => {
    const desc = i?.description || i?.item_desc || "";
    return desc.toLowerCase() === itemSearchQuery.toLowerCase();
  }) && (
            <div
              className="px-2 py-1 text-xs text-blue-600 cursor-pointer hover:bg-gray-100"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                handleSalesDataChange(index, "itemDescription", itemSearchQuery);
                handleSalesDataChange(index, "itemId", null);
                setItemSearchQuery("");
                itemSearchInputRef.current?.focus();
              }}
            >
              Add "{itemSearchQuery}" <span className="text-red-500 ml-1"></span>
            </div>
          )}
      </SelectContent>
    </Select>
  ) : (
    // Show simple text input in ONLINE mode
    <input
      type="text"
      className={`w-full h-6 text-xs text-black px-2 border-none bg-transparent focus:outline-none ${
        onlineMode && salesData[index]?.isFetched ? "bg-gray-100 cursor-not-allowed" : ""
      }`}
      value={salesData[index]?.itemDescription || ""}
      onChange={(e) => {
        if (onlineMode && salesData[index]?.isFetched) return;
        handleSalesDataChange(index, "itemDescription", e.target.value)
      }}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck="false"
      data-form-type="other"
      readOnly={onlineMode && salesData[index]?.isFetched}
    />
  )}
</div>





                        
                       <div className="bg-white border border-gray-300 p-1">
  <input
    type="text"
    className={`w-full h-6 text-xs text-black px-2 border-none bg-transparent focus:outline-none text-right ${
      onlineMode && salesData[index]?.isFetched ? "bg-gray-100 cursor-not-allowed" : ""
    }`}
    value={salesData[index]?.dcQty || ""}
    onChange={(e) => {
      if (onlineMode && salesData[index]?.isFetched) return; // ❌ block editing
      handleSalesDataChange(index, "dcQty", e.target.value);
    }}
    autoComplete="off"
    autoCorrect="off"
    autoCapitalize="off"
    spellCheck="false"
    data-form-type="other"
    readOnly={onlineMode && salesData[index]?.isFetched} // ✅ fully controlled
  />
</div>

<div className="bg-white border border-gray-300 p-1">
  <input
    type="text"
    className={`w-full h-6 text-xs text-black px-2 border-none bg-transparent focus:outline-none text-right ${
      onlineMode && salesData[index]?.isFetched ? "bg-gray-100 cursor-not-allowed" : ""
    }`}
    value={salesData[index]?.doQty || ""}
    onChange={(e) => {
      if (onlineMode && salesData[index]?.isFetched) return; // ❌ block editing
      handleSalesDataChange(index, "doQty", e.target.value);
    }}
    autoComplete="off"
    autoCorrect="off"
    autoCapitalize="off"
    spellCheck="false"
    data-form-type="other"
    readOnly={onlineMode && salesData[index]?.isFetched} // ✅ fully controlled
  />
</div>


                        <div className="bg-white border border-gray-300 p-1">
                          {onlineMode ? (
                            // ✅ Online mode: backend se aaya hua branch value show kare
                            <input
                              type="text"
                              className="w-full h-6 text-xs text-black px-2 border-none bg-transparent focus:outline-none text-right"
                              value={salesData[index]?.branch || ""}
                              readOnly
                            />
                          ) : (
                            // ✅ Offline mode: master section ka branch name dikhana hai jab DC no ho
                            <input
                              type="text"
                              className="w-full h-6 text-xs text-black px-2 border-none bg-transparent focus:outline-none text-right"
                              value={
                                salesData[index]?.doNo
                                  ? branches.find(
                                      (b) =>
                                        b.branch_id.toString() ===
                                        formData.branchId?.toString()
                                    )?.branch_name || ""
                                  : ""
                              }
                              readOnly
                            />
                          )}
                        </div>

                        <div className="bg-white border border-gray-300 p-1 flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleSalesRowDelete(index)}
                            className="text-red-500 hover:text-red-700 text-lg font-bold"
                            title="Delete row"
                          >
                            ✖
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total Row */}
                  <div
                    className="grid gap-px text-xs font-semibold mb-4"
                    style={{
                      gridTemplateColumns:
                        "80px 80px 170px 120px 110px 170px 60px 60px 90px 40px",
                      width: "830px",
                      height: "5px",
                      marginTop: "90px",
                    }}
                  >
                    <div className="bg-gray-200 border border-gray-400 p-0.5"></div>
                    <div className="bg-gray-200 border border-gray-400 p-0.5"></div>
                    <div className="bg-gray-200 border border-gray-400 p-0.5"></div>
                    <div className="bg-gray-200 border border-gray-400 p-0.5"></div>
                    <div className="bg-gray-200 border border-gray-400 p-O.5"></div>
                    <div className="bg-gray-200 border border-gray-400 p-0.5 flex items-center justify-end">
                      <span className="text-black">Total:</span>
                    </div>

                    <div className="bg-white border border-gray-400 p-1">
                      <input
                        type="text"
                        className="w-full h-4 text-xs text-black px-2 border-none bg-transparent focus:outline-none text-right font-semibold"
                        readOnly
                        value={salesData.reduce(
                          (sum, row) => sum + (parseFloat(row.dcQty) || 0),
                          0
                        )}
                      />
                    </div>
                    <div className="bg-white border border-gray-400 p-0.5">
                      <input
                        type="text"
                        className="w-full h-5 text-xs text-black px-2 border-none bg-transparent focus:outline-none text-right font-semibold"
                        readOnly
                        value={salesData.reduce(
                          (sum, row) => sum + (parseFloat(row.doQty) || 0),
                          0
                        )}
                      />
                    </div>
                    <div className="bg-gray-200 border border-gray-400 p-0.5"></div>
                  </div>

                  {/* Bottom section with Weight Per Bags, Total Weight Out, and Total Feed Bags - matching image layout */}
                  <div
                    className="bg-gray-100 p-0.5 flex justify-between items-center border border-gray-300 mt-0"
                    style={{ width: "990px" }}
            
            >
          <div className="bg-gray-300 flex items-center space-x-4">
  <div className="flex items-center space-x-2">
    <label className="text-xs font-medium text-black">
      Weight Per Bags:
    </label>
    <input
      type="text"
      className="w-24 h-6 text-xs text-black border border-gray-300 px-2 focus:outline-none"
      value={formData.weightPerBags || ""}
      readOnly
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck="false"
      data-form-type="other"
    />
  </div>
</div>



                    <div className="bg-gray-300 flex items-center space-x-2">
                      <label className="text-sm font-medium text-black">
                        Total Weight Diff:
                      </label>
                      <input
                        type="text"
                        className={`w-32 h-6 text-sm border border-gray-300 px-2 focus:outline-none ${
                          Math.abs(totalWeightDiff) > 30
                            ? "bg-red-200 text-red-800"
                            : "bg-white text-black"
                        }`}
                        value={totalWeightDiff.toFixed(2)}
                        readOnly
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        data-form-type="other"
                      />
                    </div>

                    <div className="bg-gray-300 flex items-center space-x-2">
                      <label className="text-sm font-medium text-black">
                        Total Feed Bags:
                      </label>
                      <input
                        type="text"
                        className="w-32 h-6 text-sm border border-gray-300 px-2 focus:outline-none text-black"
                        value={salesData.reduce(
                          (sum, row) => sum + (parseFloat(row.dcQty) || 0),
                          0
                        )}
                        readOnly
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        data-form-type="other"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Side - Weight Display and Bag Table (Columns 9-12) */}
            <div className="col-span-4">
              {/* This section will contain the right side components */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
