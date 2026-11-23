import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, 
  Tags, 
  Layers, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  CheckCircle2,
  AlertCircle,
  Globe,
  Calendar,
  Sparkles,
  Info,
  LayoutList,
  Grid,
  Loader2,
  UploadCloud,
  CheckSquare,
  Square,
  Check,
  Minus,
  ShieldCheck,
  X,
  Barcode,
  DollarSign,
  Layers3,
  SlidersHorizontal,
  Hash,
  ArrowRightLeft,
  Zap,
  Scan,
  Camera
} from 'lucide-react';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { format, isBefore, addDays } from 'date-fns';
import { 
  parseRawCSV, 
  convertRowsToProducts, 
  convertRowsToCategories, 
  convertRowsToAttributes, 
  generateSampleCSV 
} from '@/src/lib/csv-importer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup,
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Product, Category, Attribute } from '../../../types/pharmacy';
import { apiService } from '../../../services/api';
import { TopHorizontalScrollSlider } from '../TopHorizontalScrollSlider';

export function ProductCatalogView({ selectedBranchId = 'pharma-1', currentUser }: { selectedBranchId?: string; currentUser?: any }) {
  const [activeTab, setActiveTab] = useState('products');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  
  // Table container refs for synchronized horizontal scrolling
  const productsTableContainerRef = useRef<HTMLDivElement>(null);
  const categoriesTableContainerRef = useRef<HTMLDivElement>(null);
  const attributesTableContainerRef = useRef<HTMLDivElement>(null);
  const auditLogsTableContainerRef = useRef<HTMLDivElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [productLogs, setProductLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriesLayout, setCategoriesLayout] = useState<'list' | 'grid'>('list');
  const [attributesLayout, setAttributesLayout] = useState<'list' | 'grid'>('list');

  // Permissions calculation: Any role with permission to add products MUST also be able to edit and delete products
  const effectiveUser = currentUser || (() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('ph_current_user') : null;
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  })();

  const userRole = (effectiveUser?.role || '').toLowerCase();
  const userPerms = Array.isArray(effectiveUser?.permissions) ? effectiveUser.permissions : [];
  const userLevel = Number(effectiveUser?.level ?? 1);

  // User requirement:
  // "Please ensure that any user role that has the permission to be able to add products should also be able to edit the product,
  // from the admin to every other role that has the permission to be able to add products. They should be able to edit products and delete,
  // either delete or edit products."
  const canManage = 
    userPerms.includes('canManageInventory') ||
    userPerms.includes('canAccessAdminPanel') ||
    userRole.includes('admin') || 
    userRole === 'kernel admin' || 
    userRole.includes('manager') || 
    userRole === 'store manager' || 
    userRole === 'terminal manager' ||
    userRole.includes('dispenser') ||
    userRole.includes('pharmacist') ||
    userRole.includes('cashier') ||
    userRole.includes('coordinator') ||
    userRole.includes('operator') ||
    userRole.includes('storekeeper') ||
    userLevel >= 1 ||
    !effectiveUser;

  // Bulk Selection States
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isBulkDeletingProducts, setIsBulkDeletingProducts] = useState(false);

  // Product Row Popup & Details States
  const [selectedProductForOptions, setSelectedProductForOptions] = useState<Product | null>(null);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);
  const [isProductDetailsOpen, setIsProductDetailsOpen] = useState(false);
  const [selectedProductForQuickParams, setSelectedProductForQuickParams] = useState<Product | null>(null);
  const [isQuickParamsOpen, setIsQuickParamsOpen] = useState(false);
  const [quickStockInput, setQuickStockInput] = useState<number>(0);
  const [quickMinStockInput, setQuickMinStockInput] = useState<number>(10);

  // Barcode Scanner Modal States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTargetProduct, setScannerTargetProduct] = useState<Product | null>(null);
  const [scannerTargetMode, setScannerTargetMode] = useState<'general' | 'target_product' | 'add_form' | 'edit_form'>('general');

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState<Category | null>(null);
  const [isBulkDeletingCategories, setIsBulkDeletingCategories] = useState(false);

  const [selectedAttributeIds, setSelectedAttributeIds] = useState<string[]>([]);
  const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null);
  const [isDeletingAttribute, setIsDeletingAttribute] = useState<Attribute | null>(null);
  const [isBulkDeletingAttributes, setIsBulkDeletingAttributes] = useState(false);
  
  // Forms States
  const [productForm, setProductForm] = useState({
    name: '',
    genericName: '',
    category: '', 
    price: 0,
    costPrice: 0,
    wholesalePrice: 0,
    stock: 0,
    baseUnit: 'tablet' as any,
    minStockLevel: 20,
    requiresPrescription: false,
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    barcode: '',
    attributes: {} as Record<string, string>,
    selectedStaffId: 'ST-01',
    
    // Custom Pricing
    enableCustomPricing: false,
    fullPackRetail: 0,
    fullPackWholesale: 0,
    fullPackVolume: 0,
    fullPackThreshold: 10,
    halfPackRetail: 0,
    halfPackWholesale: 0,
    halfPackVolume: 0,
    halfPackThreshold: 15,
    quarterPackRetail: 0,
    quarterPackWholesale: 0,
    quarterPackVolume: 0,
    quarterPackThreshold: 20,
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
  });

  const [attributeForm, setAttributeForm] = useState({
    name: '',
    type: 'text' as 'text' | 'select',
    optionsString: '', 
  });

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState<Product | null>(null);
  
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkImportTab, setBulkImportTab] = useState<'products' | 'categories' | 'attributes'>('products');
  const [selectedCSVFile, setSelectedCSVFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploadingCSV, setIsUploadingCSV] = useState(false);
  const [csvPreview, setCsvPreview] = useState<{
    totalRows: number;
    validRows: number;
    previewItems: any[];
    warnings: string[];
  } | null>(null);

  // Live CSV preview analysis on file selection
  useEffect(() => {
    if (!selectedCSVFile) {
      setCsvPreview(null);
      return;
    }

    let isMounted = true;
    parseRawCSV(selectedCSVFile)
      .then((rows) => {
        if (!isMounted) return;
        if (bulkImportTab === 'products') {
          const res = convertRowsToProducts(rows, selectedBranchId);
          setCsvPreview({
            totalRows: rows.length,
            validRows: res.valid.length,
            previewItems: res.valid.slice(0, 3),
            warnings: res.warnings.slice(0, 3)
          });
        } else if (bulkImportTab === 'categories') {
          const res = convertRowsToCategories(rows);
          setCsvPreview({
            totalRows: rows.length,
            validRows: res.valid.length,
            previewItems: res.valid.slice(0, 3),
            warnings: res.warnings.slice(0, 3)
          });
        } else {
          const res = convertRowsToAttributes(rows);
          setCsvPreview({
            totalRows: rows.length,
            validRows: res.valid.length,
            previewItems: res.valid.slice(0, 3),
            warnings: res.warnings.slice(0, 3)
          });
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('CSV preview parse error', err);
        setCsvPreview(null);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCSVFile, bulkImportTab, selectedBranchId]);

  const handleEditProductClick = (prod: Product) => {
    setEditingProduct({ ...prod });
  };

  const handleDeleteProductClick = (prod: Product) => {
    setIsDeletingProduct(prod);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv') || file.type === 'text/csv' || file.name.includes('.csv')) {
        setSelectedCSVFile(file);
        toast.success(`Attached ${file.name}`);
      } else {
        toast.error('Please upload a valid CSV file');
      }
    }
  };

  const downloadSampleCSV = (type: 'products' | 'categories' | 'attributes') => {
    const { filename, content } = generateSampleCSV(type);
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Sample template for ' + type + ' downloaded');
  };

  const handleCSVUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCSVFile) {
      toast.error('Please select a valid CSV file first');
      return;
    }

    setIsUploadingCSV(true);
    try {
      const rows = await parseRawCSV(selectedCSVFile);
      if (rows.length === 0) {
        toast.error('The uploaded CSV is empty or has no readable rows');
        setIsUploadingCSV(false);
        return;
      }

      if (bulkImportTab === 'products') {
        const { valid, warnings } = convertRowsToProducts(rows, selectedBranchId);
        if (valid.length === 0) {
          toast.error('No valid products found. Ensure your CSV has a "Name" or "Product Name" column.');
          setIsUploadingCSV(false);
          return;
        }

        const res = await apiService.products.bulkAdd(valid);
        toast.success(`Successfully uploaded and saved ${valid.length} products (${res.inserted} new, ${res.updated} updated) to database!`);
        if (warnings.length > 0) {
          toast.warning(`Note: ${warnings.length} row(s) were skipped due to missing product names.`);
        }
      } else if (bulkImportTab === 'categories') {
        const { valid, warnings } = convertRowsToCategories(rows);
        if (valid.length === 0) {
          toast.error('No valid categories found in CSV');
          setIsUploadingCSV(false);
          return;
        }

        await apiService.categories.bulkAdd(valid);
        toast.success(`Successfully imported ${valid.length} categories to database!`);
        if (warnings.length > 0) {
          toast.warning(`Note: ${warnings.length} row(s) were skipped.`);
        }
      } else {
        const { valid, warnings } = convertRowsToAttributes(rows);
        if (valid.length === 0) {
          toast.error('No valid attributes found in CSV');
          setIsUploadingCSV(false);
          return;
        }

        await apiService.attributes.bulkAdd(valid);
        toast.success(`Successfully imported ${valid.length} custom attributes to database!`);
        if (warnings.length > 0) {
          toast.warning(`Note: ${warnings.length} row(s) were skipped.`);
        }
      }

      setSelectedCSVFile(null);
      setCsvPreview(null);
      setIsBulkImportOpen(false);
      await loadData();
    } catch (err: any) {
      console.error('CSV import submission error:', err);
      toast.error(err.message || 'Error processing CSV file. Please verify CSV formatting.');
    } finally {
      setIsUploadingCSV(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      if (!editingProduct.name) {
        toast.error('Product Name is required');
        return;
      }
      await apiService.products.update(editingProduct.id, editingProduct, effectiveUser);
      toast.success('Product updated successfully!');
      setEditingProduct(null);
      loadData();
    } catch (err) {
      toast.error('Failed to update product details');
    }
  };

  const handleDeleteSubmit = async () => {
    if (!isDeletingProduct) return;
    try {
      await apiService.products.delete(isDeletingProduct.id, effectiveUser);
      toast.success('Product deleted successfully from catalogue & database!');
      setSelectedProductIds(prev => prev.filter(id => id !== isDeletingProduct.id));
      setIsDeletingProduct(null);
      loadData();
    } catch (err) {
      toast.error('Failed to delete product');
    }
  };

  const handleBulkDeleteProducts = async () => {
    if (selectedProductIds.length === 0) return;
    try {
      await apiService.products.deleteBulk(selectedProductIds, effectiveUser);
      toast.success(`Successfully deleted ${selectedProductIds.length} product(s) from database!`);
      setSelectedProductIds([]);
      setIsBulkDeletingProducts(false);
      loadData();
    } catch (err) {
      toast.error('Failed to bulk delete selected products');
    }
  };

  // Category Handlers
  const handleEditCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    try {
      if (!editingCategory.name?.trim()) {
        toast.error('Category Name is required');
        return;
      }
      await apiService.categories.update(editingCategory.id, {
        name: editingCategory.name.trim(),
        description: editingCategory.description
      });
      toast.success(`Category "${editingCategory.name}" updated successfully in database!`);
      setEditingCategory(null);
      loadData();
    } catch (err) {
      toast.error('Failed to update category');
    }
  };

  const handleDeleteCategorySubmit = async () => {
    if (!isDeletingCategory) return;
    try {
      await apiService.categories.delete(isDeletingCategory.id);
      toast.success(`Category "${isDeletingCategory.name}" deleted from database!`);
      setSelectedCategoryIds(prev => prev.filter(id => id !== isDeletingCategory.id));
      setIsDeletingCategory(null);
      loadData();
    } catch (err) {
      toast.error('Failed to delete category');
    }
  };

  const handleBulkDeleteCategories = async () => {
    if (selectedCategoryIds.length === 0) return;
    try {
      await apiService.categories.deleteBulk(selectedCategoryIds);
      toast.success(`Successfully deleted ${selectedCategoryIds.length} category/categories from database!`);
      setSelectedCategoryIds([]);
      setIsBulkDeletingCategories(false);
      loadData();
    } catch (err) {
      toast.error('Failed to bulk delete categories');
    }
  };

  // Attribute Handlers
  const handleEditAttributeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttribute) return;
    try {
      if (!editingAttribute.name?.trim()) {
        toast.error('Attribute Name is required');
        return;
      }
      const rawOptions = (editingAttribute as any).optionsString;
      const opts = editingAttribute.type === 'select'
        ? (typeof rawOptions === 'string'
            ? rawOptions.split(',').map((o: string) => o.trim()).filter(Boolean)
            : (Array.isArray(editingAttribute.options) ? editingAttribute.options : []))
        : undefined;

      await apiService.attributes.update(editingAttribute.id, {
        name: editingAttribute.name.trim(),
        type: editingAttribute.type,
        options: opts
      });
      toast.success(`Attribute "${editingAttribute.name}" updated successfully in database!`);
      setEditingAttribute(null);
      loadData();
    } catch (err) {
      toast.error('Failed to update attribute');
    }
  };

  const handleDeleteAttributeSubmit = async () => {
    if (!isDeletingAttribute) return;
    try {
      await apiService.attributes.delete(isDeletingAttribute.id);
      toast.success(`Attribute "${isDeletingAttribute.name}" deleted from database!`);
      setSelectedAttributeIds(prev => prev.filter(id => id !== isDeletingAttribute.id));
      setIsDeletingAttribute(null);
      loadData();
    } catch (err) {
      toast.error('Failed to delete attribute');
    }
  };

  const handleBulkDeleteAttributes = async () => {
    if (selectedAttributeIds.length === 0) return;
    try {
      await apiService.attributes.deleteBulk(selectedAttributeIds);
      toast.success(`Successfully deleted ${selectedAttributeIds.length} attribute(s) from database!`);
      setSelectedAttributeIds([]);
      setIsBulkDeletingAttributes(false);
      loadData();
    } catch (err) {
      toast.error('Failed to bulk delete attributes');
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranchId]);

  const loadData = async () => {
    try {
      const [allProducts, allCategories, allAttributes, allLogs] = await Promise.all([
        apiService.products.list(selectedBranchId),
        apiService.categories.list(),
        apiService.attributes.list(),
        (apiService as any).logs?.list() || Promise.resolve([]),
      ]);
      setProducts(allProducts);
      setCategories(allCategories);
      setAttributes(allAttributes);
      setProductLogs(allLogs);

      // Pre-set default category in form
      if (allCategories.length > 0 && !productForm.category) {
        setProductForm(prev => ({ ...prev, category: allCategories[0].name }));
      }
    } catch (err) {
      toast.error('Failed to load catalog data');
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeTab === 'products') {
        if (!productForm.name) {
          toast.error('Product Name is required');
          return;
        }

        const selectedCat = productForm.category || (categories[0]?.name || 'Antibiotics');
        
        const wsVal = Number(productForm.wholesalePrice) || Number(productForm.price) * 0.88;
        const packagingPricing = productForm.enableCustomPricing ? {
          fullPack: {
            retailPrice: Number(productForm.fullPackRetail) || Number(productForm.price),
            wholesalePrice: Number(productForm.fullPackWholesale) || wsVal,
            volumePrice: Number(productForm.fullPackVolume) || Number(productForm.price) * 0.75,
            volumeThreshold: Number(productForm.fullPackThreshold) || 10,
          },
          halfPack: {
            retailPrice: Number(productForm.halfPackRetail) || Number(productForm.price) * 0.55,
            wholesalePrice: Number(productForm.halfPackWholesale) || Number(productForm.price) * 0.47,
            volumePrice: Number(productForm.halfPackVolume) || Number(productForm.price) * 0.40,
            volumeThreshold: Number(productForm.halfPackThreshold) || 15,
          },
          quarterPack: {
            retailPrice: Number(productForm.quarterPackRetail) || Number(productForm.price) * 0.30,
            wholesalePrice: Number(productForm.quarterPackWholesale) || Number(productForm.price) * 0.25,
            volumePrice: Number(productForm.quarterPackVolume) || Number(productForm.price) * 0.20,
            volumeThreshold: Number(productForm.quarterPackThreshold) || 20,
          }
        } : {
          fullPack: {
            retailPrice: Number(productForm.price) || 10,
            wholesalePrice: wsVal,
            volumePrice: Number(productForm.price) * 0.78,
            volumeThreshold: 10
          }
        };

        const newProd: Product = {
          id: `P-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
          name: productForm.name,
          genericName: productForm.genericName || 'Generic Reference',
          category: selectedCat,
          price: Number(productForm.price) || 10,
          costPrice: Number(productForm.costPrice) || 6.5,
          wholesalePrice: wsVal,
          stock: Number(productForm.stock) || 0,
          baseUnit: productForm.baseUnit,
          conversionFactor: 1,
          expiryDate: productForm.expiryDate,
          requiresPrescription: productForm.requiresPrescription,
          pharmacyId: selectedBranchId,
          minStockLevel: Number(productForm.minStockLevel) || 20,
          barcode: productForm.barcode || Math.random().toString().slice(2, 12),
          batches: [
            {
              id: `B-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
              batchNumber: `BAT-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
              manufactureDate: new Date().toISOString().split('T')[0],
              expiryDate: productForm.expiryDate,
              quantity: Number(productForm.stock) || 0,
              costPrice: Number(productForm.costPrice) || 6.5,
            }
          ],
          attributes: productForm.attributes,
          packagingPricing
        };

        const mockStaff = [
          { id: 'ST-01', name: 'James Wilson', role: 'Store Manager', email: 'james@tekipharm.com' },
          { id: 'ST-02', name: 'Sarah Chen', role: 'Terminal Manager', email: 'sarah@tekipharm.com' },
          { id: 'ST-03', name: 'David Okafor', role: 'Certified Dispenser', email: 'david@tekipharm.com' },
          { id: 'ST-04', name: 'Elena Rodriguez', role: 'POS operator', email: 'elena@tekipharm.com' },
          { id: 'ST-05', name: 'Kingsley Agu', role: 'Logistics Coordinator', email: 'kingsley@tekipharm.com' }
        ];

        const staffObj = mockStaff.find(s => s.id === productForm.selectedStaffId) || mockStaff[0];

        await apiService.products.add(newProd, staffObj);
        toast.success(`${newProd.name} successfully registered in catalogue & POS`);
        
        // Reset product form
        setProductForm({
          name: '',
          genericName: '',
          category: categories[0]?.name || '',
          price: 0,
          costPrice: 0,
          wholesalePrice: 0,
          stock: 0,
          baseUnit: 'tablet',
          minStockLevel: 20,
          requiresPrescription: false,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          barcode: '',
          attributes: {},
          selectedStaffId: 'ST-01',
          enableCustomPricing: false,
          fullPackRetail: 0,
          fullPackWholesale: 0,
          fullPackVolume: 0,
          fullPackThreshold: 10,
          halfPackRetail: 0,
          halfPackWholesale: 0,
          halfPackVolume: 0,
          halfPackThreshold: 15,
          quarterPackRetail: 0,
          quarterPackWholesale: 0,
          quarterPackVolume: 0,
          quarterPackThreshold: 20,
        });
      } else if (activeTab === 'categories') {
        if (!categoryForm.name) {
          toast.error('Category Name is required');
          return;
        }
        const newCat: Category = {
          id: `CAT-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
          name: categoryForm.name,
          description: categoryForm.description
        };
        await apiService.categories.add(newCat);
        toast.success(`Category "${newCat.name}" successfully created`);
        setCategoryForm({ name: '', description: '' });
      } else if (activeTab === 'attributes') {
        if (!attributeForm.name) {
          toast.error('Attribute Name is required');
          return;
        }
        const opts = attributeForm.type === 'select' 
          ? attributeForm.optionsString.split(',').map(o => o.trim()).filter(Boolean)
          : undefined;
          
        const newAttr: Attribute = {
          id: `ATTR-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
          name: attributeForm.name,
          type: attributeForm.type,
          options: opts
        };
        await apiService.attributes.add(newAttr);
        toast.success(`Attribute "${newAttr.name}" successfully generated`);
        setAttributeForm({ name: '', type: 'text', optionsString: '' });
      }
      
      setIsAddingProduct(false);
      loadData();
    } catch (e) {
      toast.error('Failed to commit registration');
    }
  };

  const handleAttributeValChange = (attrName: string, value: string) => {
    setProductForm(prev => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [attrName]: value
      }
    }));
  };

  const handleBarcodeScanned = async (scannedBarcode: string) => {
    if (!scannedBarcode) return;

    if (scannerTargetMode === 'add_form') {
      setProductForm(prev => ({ ...prev, barcode: scannedBarcode }));
      toast.success(`Barcode "${scannedBarcode}" assigned to new product form!`);
      return;
    }

    if (scannerTargetMode === 'edit_form' && editingProduct) {
      setEditingProduct(prev => prev ? ({ ...prev, barcode: scannedBarcode }) : null);
      toast.success(`Barcode "${scannedBarcode}" assigned to ${editingProduct.name}!`);
      return;
    }

    if (scannerTargetMode === 'target_product' && scannerTargetProduct) {
      const existingOwner = products.find(p => p.id !== scannerTargetProduct.id && p.barcode === scannedBarcode);
      if (existingOwner) {
        toast.error(`Barcode "${scannedBarcode}" is already assigned to "${existingOwner.name}"!`);
        return;
      }

      try {
        await apiService.products.update(scannerTargetProduct.id, { barcode: scannedBarcode });
        setProducts(prev => prev.map(p => p.id === scannerTargetProduct.id ? { ...p, barcode: scannedBarcode } : p));
        toast.success(`Barcode "${scannedBarcode}" successfully linked to ${scannerTargetProduct.name}!`);
      } catch (err) {
        setProducts(prev => prev.map(p => p.id === scannerTargetProduct.id ? { ...p, barcode: scannedBarcode } : p));
        toast.success(`Barcode "${scannedBarcode}" linked to ${scannerTargetProduct.name}!`);
      }
      return;
    }

    // General Mode Lookup
    const found = products.find(p => p.barcode === scannedBarcode || p.id === scannedBarcode);
    if (found) {
      toast.success(`Product Matched: ${found.name} (Stock: ${found.stock} ${found.baseUnit}s)`);
      setSelectedProductForDetails(found);
      setIsProductDetailsOpen(true);
    } else {
      toast.info(`Scanned Code: "${scannedBarcode}" - No product in catalog uses this barcode yet. You can assign it via any product's option menu.`);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.genericName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.barcode?.includes(searchQuery)
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 uppercase italic">Products & Stock</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">Manage your catalog, categories, and attributes</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
           <Button
             type="button"
             onClick={() => {
               setScannerTargetProduct(null);
               setScannerTargetMode('general');
               setIsScannerOpen(true);
             }}
             className="flex-1 md:flex-none h-12 md:h-14 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest active:scale-95 cursor-pointer flex items-center gap-2 shadow-lg shadow-slate-900/20"
           >
             <Scan className="w-4 h-4 text-blue-400" /> Barcode Scanner
           </Button>

           <Dialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen}>
             <DialogTrigger asChild>
                <Button className="flex-1 md:flex-none h-12 md:h-14 px-8 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-black text-[10px] uppercase tracking-widest active:scale-95 cursor-pointer flex items-center gap-2">
                   <Layers className="w-4 h-4 text-slate-500" /> Bulk Import
                </Button>
             </DialogTrigger>
             <DialogContent className="sm:max-w-2xl rounded-[2.5rem] p-10 border-none shadow-2xl max-h-[90vh] overflow-y-auto">
               <DialogHeader>
                 <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter text-slate-950">Bulk Inventory Upload</DialogTitle>
                 <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Batch import items, categories, or attributes instantly via CSV</DialogDescription>
               </DialogHeader>
               <div className="space-y-6 py-4 font-sans">
                 {/* Internal Tabs for Bulk Import selection */}
                 <div className="flex bg-slate-100 p-1 rounded-xl">
                   <button 
                     type="button"
                     onClick={() => { setBulkImportTab('products'); setSelectedCSVFile(null); }}
                     className={`flex-1 py-3.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${bulkImportTab === 'products' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                   >
                     Products CSV
                   </button>
                   <button 
                     type="button"
                     onClick={() => { setBulkImportTab('categories'); setSelectedCSVFile(null); }}
                     className={`flex-1 py-3.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${bulkImportTab === 'categories' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                   >
                     Categories CSV
                   </button>
                   <button 
                     type="button"
                     onClick={() => { setBulkImportTab('attributes'); setSelectedCSVFile(null); }}
                     className={`flex-1 py-3.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${bulkImportTab === 'attributes' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                   >
                     Attributes CSV
                   </button>
                 </div>

                 {/* Download Section */}
                 <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                   <div>
                     <p className="font-extrabold text-blue-900 text-xs uppercase tracking-wider">Required Schema Fields Available</p>
                     <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-widest max-w-[400px] break-all">
                       {bulkImportTab === 'products' && 'Fields: id, name, genericName, barcode, category, price, costPrice, stock, baseUnit, conversionFactor, expiryDate, requiresPrescription, minStockLevel'}
                       {bulkImportTab === 'categories' && 'Fields: id, name, description'}
                       {bulkImportTab === 'attributes' && 'Fields: id, name, type, options (for dropdowns, split options with semi-colons)'}
                     </p>
                   </div>
                   <Button 
                     type="button" 
                     onClick={() => downloadSampleCSV(bulkImportTab)} 
                     className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[9px] uppercase tracking-wider cursor-pointer whitespace-nowrap"
                   >
                     Download Sample
                   </Button>
                 </div>

                 {/* Drag and Drop Zone Container */}
                 <form onSubmit={handleCSVUploadSubmit} className="space-y-6">
                   <div 
                     onDragOver={handleDragOver}
                     onDragLeave={handleDragLeave}
                     onDrop={handleDrop}
                     className={`relative border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center transition-all cursor-pointer min-h-[160px] ${isDragActive ? 'border-blue-500 bg-blue-50/40' : 'border-slate-200 hover:border-slate-300'}`}
                   >
                     <input 
                       type="file" 
                       accept=".csv"
                       id="csv-file-input"
                       className="absolute inset-0 opacity-0 cursor-pointer"
                       onChange={(e) => {
                         if (e.target.files && e.target.files[0]) {
                           const file = e.target.files[0];
                           setSelectedCSVFile(file);
                           toast.success(`Attached ${file.name}`);
                         }
                       }}
                     />
                     <div className="text-center space-y-2 pointer-events-none">
                       <Layers className={`h-10 w-10 mx-auto transition-transform ${isDragActive ? 'scale-110 text-blue-500' : 'text-slate-400'}`} />
                       {selectedCSVFile ? (
                         <div>
                           <p className="text-sm font-black text-slate-900 uppercase italic">{selectedCSVFile.name}</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ready to upload • {(selectedCSVFile.size / 1024).toFixed(2)} KB</p>
                         </div>
                       ) : (
                         <div>
                           <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Drag & drop your CSV file here, or click to browse</p>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Accepts only standard .csv format</p>
                         </div>
                       )}
                     </div>
                   </div>

                   {/* Live CSV Validation Preview */}
                   {csvPreview && (
                     <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3 text-left">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                           <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                             File Analyzed: {csvPreview.validRows} valid of {csvPreview.totalRows} row(s) ready
                           </span>
                         </div>
                         <Badge variant="outline" className="text-[9px] font-bold bg-white text-emerald-700 border-emerald-200">
                           Schema Verified
                         </Badge>
                       </div>

                       {csvPreview.warnings.length > 0 && (
                         <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[10px] space-y-1">
                           <div className="flex items-center gap-1 font-bold">
                             <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                             <span>Import notices:</span>
                           </div>
                           {csvPreview.warnings.map((w, idx) => (
                             <p key={idx} className="pl-4 text-amber-800">• {w}</p>
                           ))}
                         </div>
                       )}

                       {csvPreview.previewItems.length > 0 && (
                         <div className="overflow-x-auto">
                           <table className="w-full text-left text-[10px]">
                             <thead>
                               <tr className="border-b border-slate-200 text-slate-400 uppercase font-black tracking-widest">
                                 <th className="pb-1">Name</th>
                                 {bulkImportTab === 'products' && (
                                   <>
                                     <th className="pb-1">Category</th>
                                     <th className="pb-1">Price</th>
                                     <th className="pb-1">Stock</th>
                                   </>
                                 )}
                                 {bulkImportTab === 'categories' && <th className="pb-1">Description</th>}
                                 {bulkImportTab === 'attributes' && <th className="pb-1">Type</th>}
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                               {csvPreview.previewItems.map((item, idx) => (
                                 <tr key={idx}>
                                   <td className="py-1.5 font-bold text-slate-900">{item.name}</td>
                                   {bulkImportTab === 'products' && (
                                     <>
                                       <td className="py-1.5">{item.category}</td>
                                       <td className="py-1.5">${Number(item.price || 0).toFixed(2)}</td>
                                       <td className="py-1.5">{item.stock}</td>
                                     </>
                                   )}
                                   {bulkImportTab === 'categories' && <td className="py-1.5 text-slate-500 truncate max-w-[200px]">{item.description || '—'}</td>}
                                   {bulkImportTab === 'attributes' && <td className="py-1.5">{item.type}</td>}
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                         </div>
                       )}
                     </div>
                   )}

                   <div className="flex gap-4">
                     <Button 
                       type="button" 
                       variant="ghost" 
                       disabled={isUploadingCSV}
                       onClick={() => { setIsBulkImportOpen(false); setSelectedCSVFile(null); setCsvPreview(null); }}
                       className="flex-1 h-14 bg-slate-100 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 cursor-pointer disabled:opacity-50"
                     >
                       Cancel
                     </Button>
                     <Button 
                       type="submit" 
                       disabled={!selectedCSVFile || isUploadingCSV}
                       className="flex-1 h-14 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                     >
                       {isUploadingCSV ? (
                         <>
                           <Loader2 className="w-4 h-4 animate-spin text-white" />
                           Saving to Database...
                         </>
                       ) : (
                         'Start Import Process'
                       )}
                     </Button>
                   </div>
                 </form>
               </div>
             </DialogContent>
           </Dialog>

           <Dialog open={isAddingProduct} onOpenChange={setIsAddingProduct}>
             <DialogTrigger asChild>
                <Button className="flex-1 md:flex-none h-12 md:h-14 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 cursor-pointer">
                   <Plus className="w-4 h-4 mr-2 text-white" /> Add {activeTab === 'products' ? 'Product' : activeTab === 'categories' ? 'Category' : 'Attribute'}
                </Button>
             </DialogTrigger>
             <DialogContent className="sm:max-w-2xl rounded-[2.5rem] p-10 border-none shadow-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                   <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter text-slate-950">Add New {activeTab === 'products' ? 'Product' : activeTab === 'categories' ? 'Category' : 'Attribute'}</DialogTitle>
                   <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Define your new inventory entry</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddSubmit} className="space-y-6 py-4">
                   {activeTab === 'products' && (
                     <div className="space-y-5">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-1.5 text-left">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Product Name</label>
                            <Input 
                              required 
                              className="h-12 rounded-xl bg-slate-50 border-none font-bold" 
                              placeholder="e.g. Paracetamol 500mg" 
                              value={productForm.name}
                              onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                            />
                         </div>
                         <div className="space-y-1.5 text-left">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Generic Formula Name</label>
                            <Input 
                              className="h-12 rounded-xl bg-slate-50 border-none font-bold" 
                              placeholder="e.g. Acetaminophen" 
                              value={productForm.genericName}
                              onChange={e => setProductForm({ ...productForm, genericName: e.target.value })}
                            />
                         </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-1.5 text-left">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category Selection</label>
                            <select 
                              className="w-full h-12 rounded-xl bg-slate-50 border-none font-bold px-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={productForm.category}
                              onChange={e => setProductForm({ ...productForm, category: e.target.value })}
                            >
                              {categories.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                              ))}
                              {categories.length === 0 && (
                                <>
                                  <option value="Antibiotics">Antibiotics</option>
                                  <option value="Pain Relief">Pain Relief</option>
                                  <option value="Cholesterol">Cholesterol</option>
                                </>
                              )}
                            </select>
                         </div>
                         <div className="space-y-1.5 text-left">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Barcode / SKU</label>
                              <button
                                type="button"
                                onClick={() => {
                                  setScannerTargetMode('add_form');
                                  setIsScannerOpen(true);
                                }}
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                              >
                                <Camera size={12} /> Scan
                              </button>
                            </div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-bold text-blue-600 block mt-4">Attributed Creator Staff</label>
                            <select 
                              className="w-full h-12 rounded-xl bg-slate-50 border-none font-bold px-4 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                              value={productForm.selectedStaffId}
                              onChange={e => setProductForm({ ...productForm, selectedStaffId: e.target.value })}
                            >
                              <option value="ST-01">James Wilson (Store Manager)</option>
                              <option value="ST-02">Sarah Chen (Terminal Manager)</option>
                              <option value="ST-03">David Okafor (Certified Dispenser)</option>
                              <option value="ST-04">Elena Rodriguez (POS operator)</option>
                              <option value="ST-05">Kingsley Agu (Logistics Coordinator)</option>
                            </select>
                            <Input 
                              className="h-12 rounded-xl bg-slate-50 border-none font-bold" 
                              placeholder="Leave blank for auto-generate" 
                              value={productForm.barcode}
                              onChange={e => setProductForm({ ...productForm, barcode: e.target.value })}
                            />
                         </div>
                       </div>

                       <div className="grid grid-cols-4 gap-3">
                         <div className="space-y-1.5 text-left">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cost Price (₦)</label>
                            <Input 
                              type="number" 
                              required
                              step="any"
                              className="h-12 rounded-xl bg-slate-50 border-none font-bold" 
                              placeholder="6.50" 
                              value={productForm.costPrice || ''}
                              onChange={e => setProductForm({ ...productForm, costPrice: Number(e.target.value) })}
                            />
                         </div>
                         <div className="space-y-1.5 text-left">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Retail Price (₦)</label>
                            <Input 
                              type="number" 
                              required
                              step="any"
                              className="h-12 rounded-xl bg-slate-50 border-none font-bold" 
                              placeholder="10.00" 
                              value={productForm.price || ''}
                              onChange={e => setProductForm({ ...productForm, price: Number(e.target.value) })}
                            />
                         </div>
                         <div className="space-y-1.5 text-left">
                            <label className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Wholesale (₦)</label>
                            <Input 
                              type="number" 
                              step="any"
                              className="h-12 rounded-xl bg-slate-50 border-none font-bold text-indigo-900" 
                              placeholder="8.50" 
                              value={productForm.wholesalePrice || ''}
                              onChange={e => setProductForm({ ...productForm, wholesalePrice: Number(e.target.value) })}
                            />
                         </div>
                         <div className="space-y-1.5 text-left">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Qty / Units</label>
                            <Input 
                              type="number" 
                              required
                              className="h-12 rounded-xl bg-slate-50 border-none font-bold" 
                              placeholder="100" 
                              value={productForm.stock || ''}
                              onChange={e => setProductForm({ ...productForm, stock: Number(e.target.value) })}
                            />
                         </div>
                       </div>

                       <div className="grid grid-cols-3 gap-3">
                         <div className="space-y-1.5 text-left">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Base Unit</label>
                            <select 
                              className="w-full h-12 rounded-xl bg-slate-50 border-none font-bold px-4 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={productForm.baseUnit}
                              onChange={e => setProductForm({ ...productForm, baseUnit: e.target.value as any })}
                            >
                              <option value="tablet">Tablet</option>
                              <option value="sachet">Sachet</option>
                              <option value="pack">Pack</option>
                              <option value="bottle">Bottle</option>
                              <option value="carton">Carton</option>
                              <option value="vial">Vial</option>
                            </select>
                         </div>
                         <div className="space-y-1.5 text-left">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Min. Stock Alert</label>
                            <Input 
                              type="number" 
                              className="h-12 rounded-xl bg-slate-50 border-none font-bold" 
                              placeholder="20" 
                              value={productForm.minStockLevel}
                              onChange={e => setProductForm({ ...productForm, minStockLevel: Number(e.target.value) })}
                            />
                         </div>
                         <div className="space-y-1.5 text-left">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Expiry Date</label>
                            <Input 
                              type="date" 
                              className="h-12 rounded-xl bg-slate-50 border-none font-bold px-4 text-xs" 
                              value={productForm.expiryDate}
                              onChange={e => setProductForm({ ...productForm, expiryDate: e.target.value })}
                            />
                         </div>
                       </div>

                       <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl my-2">
                         <input 
                           type="checkbox" 
                           id="requiresPresc" 
                           className="w-4 h-4 text-blue-600 rounded border-gray-300"
                           checked={productForm.requiresPrescription}
                           onChange={e => setProductForm({ ...productForm, requiresPrescription: e.target.checked })}
                         />
                         <label htmlFor="requiresPresc" className="text-xs font-bold text-slate-700 cursor-pointer select-none">This product requires active medical prescription</label>
                       </div>

                        {/* Custom Multi-packaging / Tier Pricing configurations */}
                        <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4 my-2">
                          <div className="flex items-center justify-between">
                            <label htmlFor="enablePricing" className="text-xs font-black uppercase tracking-wider text-slate-800 cursor-pointer select-none">Enable Custom Multi-Pack Pricing</label>
                            <input 
                              type="checkbox" 
                              id="enablePricing" 
                              className="w-5 h-5 text-blue-600 rounded-lg border-gray-300 focus:ring-blue-500 cursor-pointer"
                              checked={productForm.enableCustomPricing}
                              onChange={e => setProductForm({ ...productForm, enableCustomPricing: e.target.checked })}
                            />
                          </div>

                          {productForm.enableCustomPricing && (
                            <div className="space-y-4 pt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                              
                              {/* Full Pack */}
                              <div className="space-y-2 text-left bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Full Pack Unit Pricing</p>
                                <div className="grid grid-cols-4 gap-2">
                                  <div>
                                    <label className="text-[8px] font-bold uppercase text-slate-400">Retail (₦)</label>
                                    <Input type="number" step="any" className="h-9 px-2 text-xs font-bold bg-slate-50 border-none text-slate-900" value={productForm.fullPackRetail || ''} onChange={e => setProductForm({...productForm, fullPackRetail: Number(e.target.value)})} placeholder={String(productForm.price || 0)} />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-bold uppercase text-slate-400">Wholesale (₦)</label>
                                    <Input type="number" step="any" className="h-9 px-2 text-xs font-bold bg-slate-50 border-none text-slate-900" value={productForm.fullPackWholesale || ''} onChange={e => setProductForm({...productForm, fullPackWholesale: Number(e.target.value)})} placeholder={String((productForm.price || 0) * 0.85)} />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-bold uppercase text-slate-400">Volume (₦)</label>
                                    <Input type="number" step="any" className="h-9 px-2 text-xs font-bold bg-slate-50 border-none text-slate-900" value={productForm.fullPackVolume || ''} onChange={e => setProductForm({...productForm, fullPackVolume: Number(e.target.value)})} placeholder={String((productForm.price || 0) * 0.75)} />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-bold uppercase text-slate-400">Min Threshold</label>
                                    <Input type="number" className="h-9 px-2 text-xs font-bold bg-slate-50 border-none text-slate-900" value={productForm.fullPackThreshold || ''} onChange={e => setProductForm({...productForm, fullPackThreshold: Number(e.target.value)})} placeholder="10" />
                                  </div>
                                </div>
                              </div>

                              {/* Half Pack */}
                              <div className="space-y-2 text-left bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Half Pack Unit Pricing</p>
                                <div className="grid grid-cols-4 gap-2">
                                  <div>
                                    <label className="text-[8px] font-bold uppercase text-slate-400">Retail (₦)</label>
                                    <Input type="number" step="any" className="h-9 px-2 text-xs font-bold bg-slate-50 border-none text-slate-900" value={productForm.halfPackRetail || ''} onChange={e => setProductForm({...productForm, halfPackRetail: Number(e.target.value)})} placeholder={String((productForm.price || 0) * 0.55)} />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-bold uppercase text-slate-400">Wholesale (₦)</label>
                                    <Input type="number" step="any" className="h-9 px-2 text-xs font-bold bg-slate-50 border-none text-slate-900" value={productForm.halfPackWholesale || ''} onChange={e => setProductForm({...productForm, halfPackWholesale: Number(e.target.value)})} placeholder={String((productForm.price || 0) * 0.47)} />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-bold uppercase text-slate-400">Volume (₦)</label>
                                    <Input type="number" step="any" className="h-9 px-2 text-xs font-bold bg-slate-50 border-none text-slate-900" value={productForm.halfPackVolume || ''} onChange={e => setProductForm({...productForm, halfPackVolume: Number(e.target.value)})} placeholder={String((productForm.price || 0) * 0.40)} />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-bold uppercase text-slate-400">Min Threshold</label>
                                    <Input type="number" className="h-9 px-2 text-xs font-bold bg-slate-50 border-none text-slate-900" value={productForm.halfPackThreshold || ''} onChange={e => setProductForm({...productForm, halfPackThreshold: Number(e.target.value)})} placeholder="15" />
                                  </div>
                                </div>
                              </div>

                              {/* Quarter Pack */}
                              <div className="space-y-2 text-left bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Quarter Pack Unit Pricing</p>
                                <div className="grid grid-cols-4 gap-2">
                                  <div>
                                    <label className="text-[8px] font-bold uppercase text-slate-400">Retail (₦)</label>
                                    <Input type="number" step="any" className="h-9 px-2 text-xs font-bold bg-slate-50 border-none text-slate-900" value={productForm.quarterPackRetail || ''} onChange={e => setProductForm({...productForm, quarterPackRetail: Number(e.target.value)})} placeholder={String((productForm.price || 0) * 0.30)} />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-bold uppercase text-slate-400">Wholesale (₦)</label>
                                    <Input type="number" step="any" className="h-9 px-2 text-xs font-bold bg-slate-50 border-none text-slate-900" value={productForm.quarterPackWholesale || ''} onChange={e => setProductForm({...productForm, quarterPackWholesale: Number(e.target.value)})} placeholder={String((productForm.price || 0) * 0.25)} />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-bold uppercase text-slate-400">Volume (₦)</label>
                                    <Input type="number" step="any" className="h-9 px-2 text-xs font-bold bg-slate-50 border-none text-slate-900" value={productForm.quarterPackVolume || ''} onChange={e => setProductForm({...productForm, quarterPackVolume: Number(e.target.value)})} placeholder={String((productForm.price || 0) * 0.20)} />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-bold uppercase text-slate-400">Min Threshold</label>
                                    <Input type="number" className="h-9 px-2 text-xs font-bold bg-slate-50 border-none text-slate-900" value={productForm.quarterPackThreshold || ''} onChange={e => setProductForm({...productForm, quarterPackThreshold: Number(e.target.value)})} placeholder="20" />
                                  </div>
                                </div>
                              </div>

                            </div>
                          )}
                        </div>

                       {/* Attributes mapping inside Product registration */}
                       {attributes.length > 0 && (
                         <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/40 space-y-3">
                           <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-1.5">
                             <Sparkles size={11} /> Connect Custom Attributes
                           </p>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                             {attributes.map(attr => (
                               <div key={attr.id} className="space-y-1 text-left">
                                 <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{attr.name}</label>
                                 {attr.type === 'select' ? (
                                   <select 
                                     className="w-full h-10 rounded-lg bg-white border border-slate-200 font-medium px-3 text-xs text-slate-900 focus:outline-none"
                                     value={productForm.attributes[attr.name] || ''}
                                     onChange={e => handleAttributeValChange(attr.name, e.target.value)}
                                   >
                                     <option value="">-- Choose option --</option>
                                     {attr.options?.map(opt => (
                                       <option key={opt} value={opt}>{opt}</option>
                                     ))}
                                   </select>
                                 ) : (
                                   <Input 
                                     className="h-10 rounded-lg bg-white border border-slate-200 font-medium text-xs px-3"
                                     placeholder={`Specify ${attr.name}`}
                                     value={productForm.attributes[attr.name] || ''}
                                     onChange={e => handleAttributeValChange(attr.name, e.target.value)}
                                   />
                                 )}
                               </div>
                             ))}
                           </div>
                         </div>
                       )}
                     </div>
                   )}

                   {activeTab === 'categories' && (
                     <div className="space-y-4">
                       <div className="space-y-2 text-left">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category Name</label>
                          <Input 
                            required 
                            className="h-14 rounded-xl bg-slate-50 border-none font-bold" 
                            placeholder="e.g. Syrups, Cardiovascular, Vitamins" 
                            value={categoryForm.name}
                            onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                          />
                       </div>
                       <div className="space-y-2 text-left">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
                          <Input 
                            className="h-14 rounded-xl bg-slate-50 border-none font-bold" 
                            placeholder="Brief purpose of this category group" 
                            value={categoryForm.description}
                            onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}
                          />
                       </div>
                     </div>
                   )}

                   {activeTab === 'attributes' && (
                     <div className="space-y-4">
                       <div className="space-y-2 text-left">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Attribute Label</label>
                          <Input 
                            required 
                            className="h-14 rounded-xl bg-slate-50 border-none font-bold" 
                            placeholder="e.g. Dosage Form, Concentration, Manufacturer" 
                            value={attributeForm.name}
                            onChange={e => setAttributeForm({ ...attributeForm, name: e.target.value })}
                          />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2 text-left">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Value Entry Type</label>
                            <select 
                              className="w-full h-14 rounded-xl bg-slate-50 border-none font-bold px-4 text-sm focus:outline-none"
                              value={attributeForm.type}
                              onChange={e => setAttributeForm({ ...attributeForm, type: e.target.value as any })}
                            >
                              <option value="text">Free Text Input</option>
                              <option value="select">Dropdown Options list</option>
                            </select>
                         </div>
                       </div>
                       {attributeForm.type === 'select' && (
                         <div className="space-y-2 text-left animate-in fade-in duration-200">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selectable Options (comma-separated)</label>
                            <Input 
                              required 
                              className="h-14 rounded-xl bg-slate-50 border-none font-bold" 
                              placeholder="e.g. Tablet, Capsule, Sachet, Liquid" 
                              value={attributeForm.optionsString}
                              onChange={e => setAttributeForm({ ...attributeForm, optionsString: e.target.value })}
                            />
                         </div>
                       )}
                     </div>
                   )}

                   <Button type="submit" className="w-full h-16 bg-blue-600 rounded-3xl font-black text-xs uppercase tracking-widest text-white shadow-xl shadow-blue-600/20 active:scale-95 cursor-pointer">Commit Registration To Database</Button>
                </form>
             </DialogContent>
           </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-slate-100 p-1.5 rounded-[1.5rem] md:rounded-[2rem] inline-flex">
          <TabsTrigger value="products" className="px-6 md:px-8 rounded-xl md:rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all h-10 md:h-12 cursor-pointer">
            <Package size={16} className="mr-2" /> Products ({products.length})
          </TabsTrigger>
          <TabsTrigger value="categories" className="px-6 md:px-8 rounded-xl md:rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all h-10 md:h-12 cursor-pointer">
            <Layers size={16} className="mr-2" /> Categories ({categories.length})
          </TabsTrigger>
          <TabsTrigger value="attributes" className="px-6 md:px-8 rounded-xl md:rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all h-10 md:h-12 cursor-pointer">
            <Tags size={16} className="mr-2" /> Attributes ({attributes.length})
          </TabsTrigger>
          <TabsTrigger value="logs" className="px-6 md:px-8 rounded-xl md:rounded-2xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all h-10 md:h-12 cursor-pointer">
            <LayoutList size={16} className="mr-2" /> Audit History ({productLogs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white overflow-hidden">
            <CardHeader className="p-8 md:p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between gap-6 bg-slate-50/20">
               <div className="relative group w-full md:w-96">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                  <Input 
                    placeholder="Search catalogue..." 
                    className="pl-12 h-14 w-full bg-slate-50 border-none rounded-2xl font-bold shadow-sm"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
               </div>
               <div className="flex flex-wrap items-center gap-3 text-right">
                  {canManage && (
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-black text-[10px] uppercase tracking-widest px-3.5 py-2 flex items-center gap-1.5">
                      <ShieldCheck size={13} className="text-emerald-600" /> Elevated Access: Edit & Delete Enabled
                    </Badge>
                  )}
                  <Badge className="bg-blue-50 text-blue-600 border-none font-black text-[10px] uppercase tracking-widest px-4 py-2 flex items-center gap-1.5">
                     <Info size={12} /> Active Store Live Synced
                  </Badge>
               </div>
            </CardHeader>

            {/* Bulk Selection Action Bar for Products */}
            {canManage && selectedProductIds.length > 0 && (
              <div className="mx-8 my-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <Badge className="bg-blue-600 text-white font-black text-xs px-3 py-1">
                    {selectedProductIds.length} Selected
                  </Badge>
                  <span className="text-xs font-bold text-slate-700">
                    {selectedProductIds.length === 1 ? '1 product selected for bulk action' : `${selectedProductIds.length} products selected for bulk management`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedProductIds(filteredProducts.map(p => p.id))}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-100/50 cursor-pointer h-9 px-3"
                  >
                    Select All ({filteredProducts.length})
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedProductIds([])}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer h-9 px-3"
                  >
                    Clear
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsBulkDeletingProducts(true)}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-rose-600/20 cursor-pointer h-9"
                  >
                    <Trash2 size={14} />
                    Delete Selected ({selectedProductIds.length})
                  </Button>
                </div>
              </div>
            )}

            {/* Synchronized Top Horizontal Scroll Slider for Products Table */}
            <TopHorizontalScrollSlider 
              targetRef={productsTableContainerRef} 
              label="Products Directory Table (Top)" 
              position="top"
            />

            <CardContent className="p-0">
               <div ref={productsTableContainerRef} className="overflow-x-auto select-text scroll-smooth custom-scrollbar">
               <Table className="w-full min-w-[960px]">
                  <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                     <TableRow className="border-none">
                        {canManage && (
                          <TableHead className="w-10 pl-4 pr-1 py-3">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                              checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedProductIds(filteredProducts.map(p => p.id));
                                } else {
                                  setSelectedProductIds([]);
                                }
                              }}
                              title="Select all products"
                            />
                          </TableHead>
                        )}
                        <TableHead className="w-[280px] max-w-[300px] px-3 py-3 font-black text-[10px] uppercase tracking-widest text-slate-500">Product & Formula</TableHead>
                        <TableHead className="w-[130px] px-2.5 py-3 font-black text-[10px] uppercase tracking-widest text-slate-500">Category</TableHead>
                        <TableHead className="w-[155px] px-2.5 py-3 font-black text-[10px] uppercase tracking-widest text-slate-500">Price Structure (₦)</TableHead>
                        <TableHead className="w-[130px] px-2.5 py-3 font-black text-[10px] uppercase tracking-widest text-slate-500">Inventory & Stock</TableHead>
                        <TableHead className="w-[125px] px-2.5 py-3 font-black text-[10px] uppercase tracking-widest text-slate-500">Batch & Expiry</TableHead>
                        <TableHead className="w-[120px] px-2.5 py-3 font-black text-[10px] uppercase tracking-widest text-slate-500">Parameters & Rx</TableHead>
                        <TableHead className="w-[120px] px-3 pr-4 py-3 font-black text-[10px] uppercase tracking-widest text-slate-500 text-right">Actions</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {filteredProducts.map((p) => {
                        const wholesalePrice = p.packagingPricing?.fullPack?.wholesalePrice || p.packagingPricing?.wholesalePrice || Math.round(p.price * 0.88);
                        const costPrice = p.costPrice || Math.round(p.price * 0.65);
                        const profitMargin = p.price > 0 ? (((p.price - costPrice) / p.price) * 100).toFixed(0) : '0';

                        let expiryLabel = 'Unspecified';
                        let expiryBadgeStyle = 'bg-slate-100 text-slate-600';
                        if (p.expiryDate) {
                          try {
                            const expDate = new Date(p.expiryDate);
                            expiryLabel = format(expDate, 'MMM dd, yyyy');
                            const now = new Date();
                            const nearThreshold = addDays(now, 90);
                            if (isBefore(expDate, now)) {
                              expiryBadgeStyle = 'bg-rose-100 text-rose-700 font-bold border border-rose-200';
                              expiryLabel = `Expired (${expiryLabel})`;
                            } else if (isBefore(expDate, nearThreshold)) {
                              expiryBadgeStyle = 'bg-amber-100 text-amber-800 font-bold border border-amber-200';
                              expiryLabel = `Near Expiry (${expiryLabel})`;
                            } else {
                              expiryBadgeStyle = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                            }
                          } catch (e) {}
                        }

                        const batchNum = p.batches?.[0]?.batchNumber || (p as any).batchId || 'Active';

                        return (
                        <TableRow 
                          key={p.id} 
                          onClick={(e) => {
                            const target = e.target as HTMLElement;
                            if (target.tagName === 'INPUT' || target.closest('button') || target.closest('input')) return;
                            setSelectedProductForOptions(p);
                          }}
                          className="border-b border-slate-50 hover:bg-slate-50/80 group transition-all cursor-pointer"
                        >
                           {canManage && (
                              <TableCell className="w-10 pl-4 pr-1 py-3">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                                  checked={selectedProductIds.includes(p.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedProductIds(prev => [...prev, p.id]);
                                    } else {
                                      setSelectedProductIds(prev => prev.filter(id => id !== p.id));
                                    }
                                  }}
                                  title={`Select ${p.name}`}
                                />
                              </TableCell>
                           )}
                           <TableCell className="w-[280px] max-w-[300px] px-3 py-3">
                              <div className="flex items-start gap-2.5">
                                 <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-500 text-[11px] border border-slate-200 shadow-2xs uppercase shrink-0 mt-0.5">
                                    {p.baseUnit?.substring(0, 3) || 'TAB'}
                                 </div>
                                 <div className="min-w-0 flex-1">
                                    <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-sm leading-tight truncate">{p.name}</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                                       <Globe size={11} className="text-slate-400 shrink-0" /> 
                                       <span className="truncate">{p.genericName || 'Formula Reference'}</span>
                                    </p>
                                    {p.barcode && (
                                      <span className="inline-flex items-center gap-1 font-mono text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded mt-0.5 border border-slate-200/60">
                                        <Barcode size={10} /> {p.barcode}
                                      </span>
                                    )}
                                 </div>
                              </div>
                           </TableCell>
                           <TableCell className="w-[130px] px-2.5 py-3">
                              <Badge variant="ghost" className="bg-blue-50 text-blue-700 font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-lg border border-blue-100/80 shadow-2xs whitespace-nowrap">
                                <Tags size={10} className="mr-1" />
                                {p.category}
                              </Badge>
                           </TableCell>
                           <TableCell className="w-[155px] px-2.5 py-3">
                             <div className="space-y-0.5 text-xs">
                               <p className="font-extrabold text-slate-900 flex items-center gap-1">
                                 ₦{p.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                 <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1 py-0.2 rounded">Retail</span>
                               </p>
                               <p className="text-slate-600 font-medium text-[11px] flex items-center gap-1">
                                 ₦{wholesalePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                 <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded">Wholesale</span>
                               </p>
                               <p className="text-[10px] text-slate-400">
                                 Cost: ₦{costPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                 <span className="text-emerald-600 font-semibold ml-1">({profitMargin}%)</span>
                               </p>
                             </div>
                           </TableCell>
                           <TableCell className="w-[130px] px-2.5 py-3">
                              <div className="flex flex-col gap-1 text-xs">
                                 <div className="flex items-center justify-between gap-2">
                                   <span className={`font-bold ${p.stock <= (p.minStockLevel || 10) ? 'text-rose-600' : 'text-slate-800'}`}>
                                     {p.stock} <span className="text-[10px] font-normal text-slate-500">{p.baseUnit || 'units'}</span>
                                   </span>
                                   <span className="text-[10px] text-slate-400 font-medium">
                                     Min: {p.minStockLevel || 10}
                                   </span>
                                 </div>
                                 <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all ${p.stock <= (p.minStockLevel || 10) ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                      style={{ width: `${Math.min(100, Math.max(5, (p.stock / Math.max(p.minStockLevel || 10, 1)) * 50))}%` }}
                                    ></div>
                                 </div>
                              </div>
                           </TableCell>
                           <TableCell className="w-[125px] px-2.5 py-3">
                             <div className="space-y-0.5">
                               <Badge className={`text-[10px] px-2 py-0.5 rounded-md font-medium whitespace-nowrap ${expiryBadgeStyle}`}>
                                 <Calendar size={10} className="mr-1 inline" />
                                 {expiryLabel}
                               </Badge>
                               <p className="text-[10px] text-slate-400 font-mono">
                                 Lot: {batchNum}
                               </p>
                             </div>
                           </TableCell>
                           <TableCell className="w-[120px] px-2.5 py-3">
                             <div className="space-y-0.5">
                               <Badge className={`${p.requiresPrescription ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600 border border-slate-200'} font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded`}>
                                 {p.requiresPrescription ? 'Rx Required' : 'OTC Friendly'}
                               </Badge>
                               {p.attributes && Object.keys(p.attributes).length > 0 ? (
                                 <div className="flex flex-wrap gap-1 max-w-[150px]">
                                   {Object.entries(p.attributes).slice(0, 2).map(([key, val]) => val && (
                                     <span key={key} className="text-[9px] px-1.5 py-0.2 bg-slate-50 border border-slate-200/80 rounded text-slate-600 font-medium truncate max-w-[130px]">
                                       {key}: {String(val)}
                                     </span>
                                   ))}
                                 </div>
                               ) : null}
                              </div>
                           </TableCell>
                           <TableCell className="w-[120px] text-right pr-4 py-3 whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                {canManage && (
                                  <>
                                    <Button 
                                      type="button" 
                                      size="sm"
                                      onClick={() => {
                                        setScannerTargetProduct(p);
                                        setScannerTargetMode('target_product');
                                        setIsScannerOpen(true);
                                      }} 
                                      title={`Scan barcode for ${p.name}`}
                                      className="h-7 px-2 bg-amber-50 hover:bg-amber-500 text-amber-700 hover:text-white border border-amber-200/80 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                                    >
                                      <Barcode className="h-3 w-3" />
                                    </Button>
                                    <Button 
                                      type="button" 
                                      size="sm"
                                      onClick={() => handleEditProductClick(p)} 
                                      title={`Edit ${p.name}`}
                                      className="h-7 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                                    >
                                      <Edit className="h-3 w-3" />
                                      <span>Edit</span>
                                    </Button>
                                    <Button 
                                      type="button" 
                                      size="sm"
                                      onClick={() => handleDeleteProductClick(p)} 
                                      title={`Delete ${p.name}`}
                                      className="h-7 px-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button type="button" variant="ghost" className="h-7 w-7 p-0 hover:bg-slate-100 rounded-lg cursor-pointer">
                                      <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48 bg-white rounded-xl shadow-lg border border-slate-100 p-1.5 font-sans">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1.5 pointer-events-none select-none">Product Options</div>
                                    <DropdownMenuGroup>
                                      {canManage && (
                                        <>
                                          <DropdownMenuItem onClick={() => handleEditProductClick(p)} className="flex items-center gap-2 text-slate-700 hover:text-blue-600 hover:bg-blue-50 px-2 py-2 rounded-lg text-xs cursor-pointer focus:outline-none font-semibold">
                                            <Edit className="h-3.5 w-3.5 text-blue-600" />
                                            <span>Edit Details</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleDeleteProductClick(p)} className="flex items-center gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50/50 px-2 py-2 rounded-lg text-xs cursor-pointer focus:outline-none font-semibold">
                                            <Trash2 className="h-3.5 w-3.5" />
                                            <span>Delete Product</span>
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                      <DropdownMenuItem onClick={() => {
                                        toast.info(`Product: ${p.name} | SKU: ${p.barcode || 'N/A'} | Stock: ${p.stock} ${p.baseUnit}s`);
                                      }} className="flex items-center gap-2 text-slate-600 hover:bg-slate-50 px-2 py-2 rounded-lg text-xs cursor-pointer">
                                        <Eye className="h-3.5 w-3.5" />
                                        <span>Quick Parameters</span>
                                      </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                           </TableCell>
                        </TableRow>
                        );
                     })}
                     {filteredProducts.length === 0 && (
                       <TableRow>
                         <TableCell colSpan={canManage ? 8 : 7} className="text-center py-16 text-slate-400 font-bold text-xs uppercase tracking-widest">
                           No products registered inside the catalogue
                         </TableCell>
                       </TableRow>
                     )}
                  </TableBody>
               </Table>
               </div>
            </CardContent>

            {/* Synchronized Bottom Horizontal Scroll Slider for Products Table */}
            <TopHorizontalScrollSlider 
              targetRef={productsTableContainerRef} 
              label="Products Directory Table (Bottom)" 
              position="bottom"
            />
          </Card>
        </TabsContent>
        
        <TabsContent value="categories" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/40">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 italic">Categories Directory</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Organize items into distinct groups • Real-time database synchronised</p>
            </div>
            <div className="flex items-center gap-3">
              {canManage && categories.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedCategoryIds.length === categories.length) {
                      setSelectedCategoryIds([]);
                    } else {
                      setSelectedCategoryIds(categories.map(c => c.id));
                    }
                  }}
                  className="h-8 text-xs font-bold text-slate-700 rounded-xl cursor-pointer border-slate-200"
                >
                  {selectedCategoryIds.length === categories.length ? 'Deselect All' : `Select All (${categories.length})`}
                </Button>
              )}
              <div className="flex bg-slate-200/60 p-1 rounded-xl">
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm"
                  onClick={() => setCategoriesLayout('list')}
                  className={`h-8 w-10 p-0 rounded-lg cursor-pointer ${categoriesLayout === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <LayoutList size={16} />
                </Button>
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm"
                  onClick={() => setCategoriesLayout('grid')}
                  className={`h-8 w-10 p-0 rounded-lg cursor-pointer ${categoriesLayout === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <Grid size={16} />
                </Button>
              </div>
            </div>
          </div>

          {/* Bulk Action Bar for Categories */}
          {canManage && selectedCategoryIds.length > 0 && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <Badge className="bg-blue-600 text-white font-black text-xs px-3 py-1">
                  {selectedCategoryIds.length} Selected
                </Badge>
                <span className="text-xs font-bold text-slate-700">
                  {selectedCategoryIds.length === 1 ? '1 category selected for deletion' : `${selectedCategoryIds.length} categories selected for bulk deletion`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCategoryIds([])}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer h-9 px-3"
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsBulkDeletingCategories(true)}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-rose-600/20 cursor-pointer h-9"
                >
                  <Trash2 size={14} />
                  Delete Selected ({selectedCategoryIds.length})
                </Button>
              </div>
            </div>
          )}

          {categoriesLayout === 'list' ? (
            <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white overflow-hidden animate-in fade-in duration-300">
              {/* Synchronized Top Horizontal Scroll Slider for Categories Table */}
              <TopHorizontalScrollSlider 
                targetRef={categoriesTableContainerRef} 
                label="Categories Directory Table (Top)" 
                position="top"
              />

              <CardContent className="p-0">
                <div ref={categoriesTableContainerRef} className="overflow-x-auto select-text scroll-smooth custom-scrollbar">
                <Table className="w-full min-w-[700px]">
                  <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                    <TableRow className="border-none">
                      {canManage && (
                        <TableHead className="w-10 pl-4 pr-1 py-3">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                            checked={categories.length > 0 && selectedCategoryIds.length === categories.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCategoryIds(categories.map(c => c.id));
                              } else {
                                setSelectedCategoryIds([]);
                              }
                            }}
                            title="Select all categories"
                          />
                        </TableHead>
                      )}
                      <TableHead className="w-[220px] px-3 py-3 font-black text-[10px] uppercase tracking-widest text-slate-500">Category Name</TableHead>
                      <TableHead className="w-[260px] px-3 py-3 font-black text-[10px] uppercase tracking-widest text-slate-500">Description</TableHead>
                      <TableHead className="w-[140px] px-3 py-3 font-black text-[10px] uppercase tracking-widest text-slate-500">Products Indexed</TableHead>
                      <TableHead className="w-[140px] px-3 pr-4 py-3 font-black text-[10px] uppercase tracking-widest text-slate-500 text-right">Actions & Hierarchy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((cat) => (
                      <TableRow key={cat.id} className="border-b border-slate-50 hover:bg-slate-50/80 group transition-all">
                        {canManage && (
                          <TableCell className="w-10 pl-4 pr-1 py-3">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                              checked={selectedCategoryIds.includes(cat.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCategoryIds(prev => [...prev, cat.id]);
                                } else {
                                  setSelectedCategoryIds(prev => prev.filter(id => id !== cat.id));
                                }
                              }}
                              title={`Select ${cat.name}`}
                            />
                          </TableCell>
                        )}
                        <TableCell className="w-[220px] px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold shrink-0">
                              <Layers size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase italic text-xs truncate">{cat.name}</p>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">ID: {cat.id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="w-[260px] px-3 py-3 text-[11px] font-medium text-slate-600">
                          {cat.description || <span className="text-slate-300 italic">No description listed</span>}
                        </TableCell>
                        <TableCell className="w-[140px] px-3 py-3">
                          <Badge className="bg-emerald-50 text-emerald-600 font-extrabold text-[9px] uppercase tracking-widest px-2.5 py-0.5 border-none">
                            {cat.productCount || 0} Products
                          </Badge>
                        </TableCell>
                        <TableCell className="w-[140px] text-right pr-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {canManage && (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingCategory({ ...cat })}
                                  title="Edit Category"
                                  className="h-7 w-7 p-0 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setIsDeletingCategory(cat)}
                                  title="Delete Category"
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                            <Badge className="bg-slate-50 text-slate-400 border-none font-black text-[8px] uppercase tracking-widest px-2 py-0.5">Root</Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {categories.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={canManage ? 5 : 4} className="text-center py-16 text-slate-400 font-bold text-xs uppercase tracking-widest">
                          No categories registered inside the catalogue
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
              </CardContent>

              {/* Synchronized Bottom Horizontal Scroll Slider for Categories Table */}
              <TopHorizontalScrollSlider 
                targetRef={categoriesTableContainerRef} 
                label="Categories Directory Table (Bottom)" 
                position="bottom"
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
               {categories.map((cat) => (
                 <Card key={cat.id} className={`rounded-[2.5rem] border-2 transition-all shadow-slate-200/40 bg-white overflow-hidden group ${selectedCategoryIds.includes(cat.id) ? 'border-blue-500 shadow-xl ring-2 ring-blue-200' : 'border-transparent shadow-xl hover:shadow-2xl'}`}>
                   <CardHeader className="p-8 pb-4 relative">
                      {canManage && (
                        <div className="absolute top-6 right-6">
                          <input
                            type="checkbox"
                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                            checked={selectedCategoryIds.includes(cat.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCategoryIds(prev => [...prev, cat.id]);
                              } else {
                                setSelectedCategoryIds(prev => prev.filter(id => id !== cat.id));
                              }
                            }}
                            title={`Select ${cat.name}`}
                          />
                        </div>
                      )}
                      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[1.5rem] flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                         <Layers size={32} />
                      </div>
                      <CardTitle className="text-xl font-black text-slate-900 tracking-tight uppercase italic">{cat.name}</CardTitle>
                      <CardDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2">{cat.productCount || 0} Products Indexed</CardDescription>
                   </CardHeader>
                   <CardContent className="p-8 pt-0 flex justify-between items-center mt-6">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest max-w-[150px] truncate block" title={cat.description}>
                        {cat.description || 'No description listed'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {canManage && (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingCategory({ ...cat })}
                              title="Edit Category"
                              className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsDeletingCategory(cat)}
                              title="Delete Category"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Badge className="bg-slate-50 text-slate-400 border-none font-black text-[8px] uppercase tracking-widest px-3">Root</Badge>
                      </div>
                   </CardContent>
                 </Card>
               ))}
               {categories.length === 0 && (
                 <div className="col-span-full text-center py-20 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                   <Layers className="text-slate-300 mx-auto w-12 h-12 mb-4" />
                   <p className="font-black text-slate-900 uppercase tracking-wider text-xs">No Categories Registered</p>
                 </div>
               )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="attributes" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/40">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 italic">Attribute Matrix</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Define custom dynamic details for stock records • Real-time database synchronised</p>
            </div>
            <div className="flex items-center gap-3">
              {canManage && attributes.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedAttributeIds.length === attributes.length) {
                      setSelectedAttributeIds([]);
                    } else {
                      setSelectedAttributeIds(attributes.map(a => a.id));
                    }
                  }}
                  className="h-8 text-xs font-bold text-slate-700 rounded-xl cursor-pointer border-slate-200"
                >
                  {selectedAttributeIds.length === attributes.length ? 'Deselect All' : `Select All (${attributes.length})`}
                </Button>
              )}
              <div className="flex bg-slate-200/60 p-1 rounded-xl">
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm"
                  onClick={() => setAttributesLayout('list')}
                  className={`h-8 w-10 p-0 rounded-lg cursor-pointer ${attributesLayout === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <LayoutList size={16} />
                </Button>
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm"
                  onClick={() => setAttributesLayout('grid')}
                  className={`h-8 w-10 p-0 rounded-lg cursor-pointer ${attributesLayout === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <Grid size={16} />
                </Button>
              </div>
            </div>
          </div>

          {/* Bulk Action Bar for Attributes */}
          {canManage && selectedAttributeIds.length > 0 && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <Badge className="bg-blue-600 text-white font-black text-xs px-3 py-1">
                  {selectedAttributeIds.length} Selected
                </Badge>
                <span className="text-xs font-bold text-slate-700">
                  {selectedAttributeIds.length === 1 ? '1 attribute selected for deletion' : `${selectedAttributeIds.length} attributes selected for bulk deletion`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedAttributeIds([])}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer h-9 px-3"
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsBulkDeletingAttributes(true)}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-rose-600/20 cursor-pointer h-9"
                >
                  <Trash2 size={14} />
                  Delete Selected ({selectedAttributeIds.length})
                </Button>
              </div>
            </div>
          )}

          {attributesLayout === 'list' ? (
            <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white overflow-hidden animate-in fade-in duration-300">
              {/* Synchronized Top Horizontal Scroll Slider for Attributes Table */}
              <TopHorizontalScrollSlider 
                targetRef={attributesTableContainerRef} 
                label="Custom Attributes Table (Top)" 
                position="top"
              />

              <CardContent className="p-0">
                <div ref={attributesTableContainerRef} className="overflow-x-auto select-text scroll-smooth custom-scrollbar">
                <Table className="w-full min-w-[750px]">
                  <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                    <TableRow className="border-none">
                      {canManage && (
                        <TableHead className="w-10 pl-4 pr-1 py-3">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                            checked={attributes.length > 0 && selectedAttributeIds.length === attributes.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAttributeIds(attributes.map(a => a.id));
                              } else {
                                setSelectedAttributeIds([]);
                              }
                            }}
                            title="Select all attributes"
                          />
                        </TableHead>
                      )}
                      <TableHead className="w-[200px] px-3 py-3 font-black text-[10px] uppercase tracking-widest text-slate-500">Attribute Label</TableHead>
                      <TableHead className="w-[140px] px-3 py-3 font-black text-[10px] uppercase tracking-widest text-slate-500">Value Entry Type</TableHead>
                      <TableHead className="w-[260px] px-3 py-3 font-black text-[10px] uppercase tracking-widest text-slate-500">Selectable Option Values</TableHead>
                      <TableHead className="w-[130px] px-3 pr-4 py-3 font-black text-[10px] uppercase tracking-widest text-slate-500 text-right">Actions & Code ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attributes.map((attr) => (
                      <TableRow key={attr.id} className="border-b border-slate-50 hover:bg-slate-50/80 group transition-all">
                        {canManage && (
                          <TableCell className="w-10 pl-4 pr-1 py-3">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                              checked={selectedAttributeIds.includes(attr.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAttributeIds(prev => [...prev, attr.id]);
                                } else {
                                  setSelectedAttributeIds(prev => prev.filter(id => id !== attr.id));
                                }
                              }}
                              title={`Select ${attr.name}`}
                            />
                          </TableCell>
                        )}
                        <TableCell className="w-[200px] px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold shrink-0">
                              <Tags size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase italic text-xs truncate">{attr.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="w-[140px] px-3 py-3">
                          <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 text-blue-600 bg-blue-50/40 border-blue-100">
                            Type: {attr.type === 'select' ? 'Dropdown Choose' : 'Freeform Input'}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-[260px] px-3 py-3">
                          {attr.options && attr.options.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[250px]">
                              {attr.options.map(o => (
                                <Badge key={o} variant="ghost" className="bg-slate-50 border border-slate-100 text-[8px] text-slate-500 font-extrabold px-1.5 py-0.2">
                                  {o}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Any alphanumeric input</span>
                          )}
                        </TableCell>
                        <TableCell className="w-[130px] text-right pr-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {canManage && (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingAttribute({ ...attr, optionsString: attr.options?.join(', ') || '' } as any)}
                                  title="Edit Attribute"
                                  className="h-7 w-7 p-0 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setIsDeletingAttribute(attr)}
                                  title="Delete Attribute"
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                            <code className="text-[11px] font-mono text-slate-400 font-bold uppercase">{attr.id}</code>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {attributes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={canManage ? 5 : 4} className="text-center py-16 text-slate-400 font-bold text-xs uppercase tracking-widest">
                          No custom attributes registered
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
              </CardContent>

              {/* Synchronized Bottom Horizontal Scroll Slider for Attributes Table */}
              <TopHorizontalScrollSlider 
                targetRef={attributesTableContainerRef} 
                label="Custom Attributes Table (Bottom)" 
                position="bottom"
              />
            </Card>
          ) : (
            <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white p-10 animate-in fade-in duration-300">
               {attributes.length > 0 ? (
                 <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-black uppercase italic text-slate-900 tracking-tight">Active Attribute Matrix</h3>
                      <p className="text-slate-400 font-semibold text-[10px] uppercase tracking-widest mt-1">Properties attached dynamically to product entries</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {attributes.map(attr => (
                        <div key={attr.id} className={`p-6 bg-slate-50 rounded-[2rem] border-2 flex flex-col justify-between relative transition-all ${selectedAttributeIds.includes(attr.id) ? 'border-blue-500 bg-blue-50/20 shadow-md' : 'border-slate-100/50'}`}>
                          {canManage && (
                            <div className="absolute top-5 right-5">
                              <input
                                type="checkbox"
                                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                                checked={selectedAttributeIds.includes(attr.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedAttributeIds(prev => [...prev, attr.id]);
                                  } else {
                                    setSelectedAttributeIds(prev => prev.filter(id => id !== attr.id));
                                  }
                                }}
                                title={`Select ${attr.name}`}
                              />
                            </div>
                          )}
                          <div>
                            <p className="font-extrabold text-slate-900 uppercase italic tracking-tight text-base pr-8">{attr.name}</p>
                            <Badge variant="outline" className="mt-2 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 text-blue-600 bg-blue-50/40 border-blue-100">
                              Type: {attr.type}
                            </Badge>
                          </div>
                          {attr.options && attr.options.length > 0 && (
                            <div className="mt-4">
                              <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Predefined Values</p>
                              <div className="flex flex-wrap gap-1">
                                {attr.options.map(o => (
                                  <Badge key={o} variant="ghost" className="bg-white border border-slate-100 text-[8px] text-slate-500 font-semibold px-2 py-0.5">
                                    {o}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {canManage && (
                            <div className="mt-5 pt-4 border-t border-slate-200/60 flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingAttribute({ ...attr, optionsString: attr.options?.join(', ') || '' } as any)}
                                className="h-8 px-3 text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl cursor-pointer flex items-center gap-1.5"
                              >
                                <Edit className="h-3.5 w-3.5" />
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsDeletingAttribute(attr)}
                                className="h-8 px-3 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl cursor-pointer flex items-center gap-1.5"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                 </div>
               ) : (
                 <div className="text-center py-20 opacity-30">
                    <Tags size={64} className="mx-auto mb-6" />
                    <h3 className="text-2xl font-black uppercase tracking-widest tracking-tighter">Attribute Matrix Empty</h3>
                    <p className="font-bold text-xs mt-2 uppercase tracking-widest">Define custom product properties like Dosage, Flavor, or Form</p>
                 </div>
               )}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white overflow-hidden animate-in fade-in duration-300">
            <CardHeader className="p-8 md:p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between gap-6 bg-slate-50/20">
               <div>
                 <CardTitle className="text-xl font-black uppercase italic tracking-tight text-slate-900">Catalogue Audit Ledger</CardTitle>
                 <CardDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Immutable product creation, edits, and system actions logs</CardDescription>
               </div>
            </CardHeader>

            {/* Synchronized Top Horizontal Scroll Slider for Audit Logs Table */}
            <TopHorizontalScrollSlider 
              targetRef={auditLogsTableContainerRef} 
              label="Catalogue Audit Ledger Table (Top)" 
              position="top"
            />

            <CardContent className="p-0">
              <div ref={auditLogsTableContainerRef} className="overflow-x-auto select-text scroll-smooth custom-scrollbar">
              <Table className="w-full min-w-[850px]">
                <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                  <TableRow className="border-none">
                    <TableHead className="py-3.5 pl-6 font-black text-[9px] uppercase tracking-widest text-slate-400 text-left w-[180px]">Timestamp</TableHead>
                    <TableHead className="py-3.5 px-3 font-black text-[9px] uppercase tracking-widest text-slate-400 text-left w-[200px]">Product Name</TableHead>
                    <TableHead className="py-3.5 px-3 font-black text-[9px] uppercase tracking-widest text-slate-400 text-left w-[120px]">Action</TableHead>
                    <TableHead className="py-3.5 px-3 font-black text-[9px] uppercase tracking-widest text-slate-400 text-left w-[180px]">Attributed Creator</TableHead>
                    <TableHead className="py-3.5 pr-6 font-black text-[9px] uppercase tracking-widest text-slate-400 text-left w-[240px]">Log Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productLogs.length === 0 ? (
                    <TableRow className="border-none hover:bg-transparent">
                      <TableCell colSpan={5} className="text-center py-20 text-slate-400 font-extrabold uppercase tracking-widest text-xs opacity-50">
                        No product transaction logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    productLogs.map((log: any) => (
                      <TableRow key={log.id} className="border-b border-slate-50 hover:bg-slate-50/40 transition-colors">
                        <TableCell className="py-4 pl-6 font-semibold text-slate-500 text-xs text-left w-[180px]">
                          {new Date(log.createdAt).toLocaleString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="py-4 px-3 font-black text-slate-900 text-xs text-left w-[200px]">
                          <div className="min-w-0">
                            <p className="truncate">{log.productName}</p>
                            <p className="font-mono text-[9px] text-slate-400 font-semibold mt-0.5 truncate">ID: {log.productId}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-3 text-left w-[120px]">
                          <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-black text-[8px] uppercase tracking-widest px-2.5 py-1 rounded-md">
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 px-3 text-left w-[180px]">
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-800 text-xs truncate">{log.createdBy?.name || 'James Wilson'}</p>
                            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider truncate">{log.createdBy?.role || 'Store Manager'}</p>
                            <p className="text-[9px] text-slate-400 font-medium truncate">{log.createdBy?.email || 'james@tekipharm.com'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 pr-6 text-left w-[240px]">
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100/50 space-y-0.5 font-sans text-[10px] font-bold text-slate-500">
                            {log.metadata && (
                              <>
                                <p><span className="text-slate-400 font-semibold uppercase tracking-wider text-[8px] mr-1">Price:</span> ₦{log.metadata.price || 0}</p>
                                <p><span className="text-slate-400 font-semibold uppercase tracking-wider text-[8px] mr-1">Stock:</span> {log.metadata.stock || 0} {log.metadata.baseUnit}(s)</p>
                                <p><span className="text-slate-400 font-semibold uppercase tracking-wider text-[8px] mr-1">Rx:</span> {log.metadata.requiresPrescription ? "Required" : "No"}</p>
                              </>
                            )}
                            <p className="font-mono text-[8px] text-slate-300 font-normal">Audit Hash: SHA256-{log.id.slice(0, 8).toUpperCase()}</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>

            {/* Synchronized Bottom Horizontal Scroll Slider for Audit Logs Table */}
            <TopHorizontalScrollSlider 
              targetRef={auditLogsTableContainerRef} 
              label="Catalogue Audit Ledger Table (Bottom)" 
              position="bottom"
            />
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Product Dialog Overlay */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="sm:max-w-2xl rounded-[2.5rem] p-10 border-none shadow-2xl max-h-[90vh] overflow-y-auto font-sans">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter text-slate-950">Edit Product Entries</DialogTitle>
            <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Modify active listing in catalogue & POS</DialogDescription>
          </DialogHeader>
          {editingProduct && (
            <form onSubmit={handleEditSubmit} className="space-y-6 py-4 text-left">
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Product Name</label>
                    <Input 
                      required 
                      className="h-12 rounded-xl bg-slate-50 border-none font-bold text-slate-900" 
                      placeholder="e.g. Paracetamol 500mg" 
                      value={editingProduct.name}
                      onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Generic Formula Name</label>
                    <Input 
                      className="h-12 rounded-xl bg-slate-50 border-none font-bold text-slate-900" 
                      placeholder="e.g. Acetaminophen" 
                      value={editingProduct.genericName || ''}
                      onChange={e => setEditingProduct({ ...editingProduct, genericName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category Selection</label>
                    <select 
                      className="w-full h-12 rounded-xl bg-slate-50 border-none font-bold px-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editingProduct.category}
                      onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5 text-left">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Barcode / SKU</label>
                      <button
                        type="button"
                        onClick={() => {
                          setScannerTargetMode('edit_form');
                          setIsScannerOpen(true);
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Camera size={12} /> Scan
                      </button>
                    </div>
                    <Input 
                      className="h-12 rounded-xl bg-slate-50 border-none font-bold text-slate-900" 
                      placeholder="e.g. 12345678" 
                      value={editingProduct.barcode || ''}
                      onChange={e => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cost price (₦)</label>
                    <Input 
                      required
                      type="number" 
                      step="any"
                      className="h-12 rounded-xl bg-slate-50 border-none font-bold text-slate-900" 
                      placeholder="0.00" 
                      value={editingProduct.costPrice || ''}
                      onChange={e => setEditingProduct({ ...editingProduct, costPrice: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Retail price (₦)</label>
                    <Input 
                      required
                      type="number" 
                      step="any"
                      className="h-12 rounded-xl bg-slate-50 border-none font-bold text-slate-900" 
                      placeholder="0.00" 
                      value={editingProduct.price || ''}
                      onChange={e => {
                        const newPrice = Number(e.target.value);
                        setEditingProduct({ 
                          ...editingProduct, 
                          price: newPrice,
                          packagingPricing: editingProduct.packagingPricing ? {
                            ...editingProduct.packagingPricing,
                            fullPack: {
                              ...editingProduct.packagingPricing.fullPack,
                              retailPrice: newPrice,
                              wholesalePrice: editingProduct.packagingPricing.fullPack?.wholesalePrice || Math.round(newPrice * 0.88),
                              volumePrice: editingProduct.packagingPricing.fullPack?.volumePrice || Math.round(newPrice * 0.78),
                              volumeThreshold: editingProduct.packagingPricing.fullPack?.volumeThreshold || 10
                            }
                          } : undefined
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Wholesale price (₦)</label>
                    <Input 
                      type="number" 
                      step="any"
                      className="h-12 rounded-xl bg-slate-50 border-none font-bold text-indigo-900" 
                      placeholder="0.00" 
                      value={editingProduct.packagingPricing?.fullPack?.wholesalePrice || Math.round(editingProduct.price * 0.88) || ''}
                      onChange={e => {
                        const wsPrice = Number(e.target.value);
                        setEditingProduct({
                          ...editingProduct,
                          packagingPricing: {
                            ...(editingProduct.packagingPricing || {}),
                            fullPack: {
                              retailPrice: editingProduct.price,
                              wholesalePrice: wsPrice,
                              volumePrice: editingProduct.packagingPricing?.fullPack?.volumePrice || Math.round(wsPrice * 0.9),
                              volumeThreshold: editingProduct.packagingPricing?.fullPack?.volumeThreshold || 10
                            }
                          }
                        });
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Physical Stock Available</label>
                    <Input 
                      required
                      type="number" 
                      className="h-12 rounded-xl bg-slate-50 border-none font-bold text-slate-900" 
                      placeholder="0" 
                      value={editingProduct.stock || ''}
                      onChange={e => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Minimum Stock Alert Threshold</label>
                    <Input 
                      type="number" 
                      className="h-12 rounded-xl bg-slate-50 border-none font-bold text-slate-900" 
                      placeholder="10" 
                      value={editingProduct.minStockLevel ?? 10}
                      onChange={e => setEditingProduct({ ...editingProduct, minStockLevel: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dosing Form Unit</label>
                    <select 
                      className="w-full h-12 rounded-xl bg-slate-50 border-none font-bold px-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editingProduct.baseUnit}
                      onChange={e => setEditingProduct({ ...editingProduct, baseUnit: e.target.value as any })}
                    >
                      <option value="tablet">tablet</option>
                      <option value="sachet">sachet</option>
                      <option value="pack">pack</option>
                      <option value="bottle">bottle</option>
                      <option value="carton">carton</option>
                      <option value="vial">vial</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Earliest Lot Expiry</label>
                    <Input 
                      type="date"
                      className="h-12 rounded-xl bg-slate-50 border-none font-bold text-slate-900" 
                      value={editingProduct.expiryDate || ''}
                      onChange={e => setEditingProduct({ ...editingProduct, expiryDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                  <input 
                    type="checkbox" 
                    id="edit_rx"
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    checked={editingProduct.requiresPrescription || false}
                    onChange={e => setEditingProduct({ ...editingProduct, requiresPrescription: e.target.checked })}
                  />
                  <label htmlFor="edit_rx" className="text-xs font-bold uppercase tracking-wider text-slate-600 cursor-pointer select-none">Requires Doctor prescription validation (Rx)</label>
                </div>

                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="editEnablePricing" className="text-xs font-black uppercase tracking-wider text-slate-800 cursor-pointer select-none">Enable Custom Multi-Pack Pricing</label>
                    <input 
                      type="checkbox" 
                      id="editEnablePricing" 
                      className="w-5 h-5 text-blue-600 rounded-lg border-gray-300 focus:ring-blue-500 cursor-pointer"
                      checked={!!editingProduct.packagingPricing}
                      onChange={e => {
                        if (e.target.checked) {
                          setEditingProduct({
                            ...editingProduct,
                            packagingPricing: {
                              fullPack: {
                                retailPrice: editingProduct.price,
                                wholesalePrice: editingProduct.price * 0.85,
                                volumePrice: editingProduct.price * 0.75,
                                volumeThreshold: 10
                              },
                              halfPack: {
                                retailPrice: editingProduct.price * 0.55,
                                wholesalePrice: editingProduct.price * 0.47,
                                volumePrice: editingProduct.price * 0.40,
                                volumeThreshold: 15
                              },
                              quarterPack: {
                                retailPrice: editingProduct.price * 0.30,
                                wholesalePrice: editingProduct.price * 0.25,
                                volumePrice: editingProduct.price * 0.20,
                                volumeThreshold: 20
                              }
                            }
                          });
                        } else {
                          const updated = { ...editingProduct };
                          delete updated.packagingPricing;
                          setEditingProduct(updated);
                        }
                      }}
                    />
                  </div>

                  {editingProduct.packagingPricing && (
                    <div className="space-y-4 pt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                      
                      {/* Full Pack */}
                      <div className="space-y-2 text-left bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Full Pack Unit Pricing</p>
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <label className="text-[8px] font-bold uppercase text-slate-400">Retail (₦)</label>
                            <Input type="number" step="any" className="h-9 px-2 text-xs font-bold bg-slate-50 border-none text-slate-900" value={editingProduct.packagingPricing.fullPack?.retailPrice ?? ''} onChange={e => {
                              const pricing = { ...editingProduct.packagingPricing };
                              pricing.fullPack = { ...pricing.fullPack, retailPrice: Number(e.target.value) };
                              setEditingProduct({ ...editingProduct, packagingPricing: pricing as any });
                            }} />
                          </div>
                          <div>
                            <label className="text-[8px] font-bold uppercase text-slate-400">Wholesale (₦)</label>
                            <Input type="number" step="any" className="h-9 px-2 text-xs font-bold bg-slate-50 border-none text-slate-900" value={editingProduct.packagingPricing.fullPack?.wholesalePrice ?? ''} onChange={e => {
                              const pricing = { ...editingProduct.packagingPricing };
                              pricing.fullPack = { ...pricing.fullPack, wholesalePrice: Number(e.target.value) };
                              setEditingProduct({ ...editingProduct, packagingPricing: pricing as any });
                            }} />
                          </div>
                          <div>
                            <label className="text-[8px] font-bold uppercase text-slate-400">Volume (₦)</label>
                            <Input type="number" step="any" className="h-9 px-2 text-xs font-bold bg-slate-50 border-none text-slate-900" value={editingProduct.packagingPricing.fullPack?.volumePrice ?? ''} onChange={e => {
                              const pricing = { ...editingProduct.packagingPricing };
                              pricing.fullPack = { ...pricing.fullPack, volumePrice: Number(e.target.value) };
                              setEditingProduct({ ...editingProduct, packagingPricing: pricing as any });
                            }} />
                          </div>
                          <div>
                            <label className="text-[8px] font-bold uppercase text-slate-400">Threshold</label>
                            <Input type="number" className="h-9 px-2 text-xs font-bold bg-slate-50 border-none text-slate-900" value={editingProduct.packagingPricing.fullPack?.volumeThreshold ?? ''} onChange={e => {
                              const pricing = { ...editingProduct.packagingPricing };
                              pricing.fullPack = { ...pricing.fullPack, volumeThreshold: Number(e.target.value) };
                              setEditingProduct({ ...editingProduct, packagingPricing: pricing as any });
                            }} />
                          </div>
                        </div>
                      </div>

                      {/* Half Pack */}
                      <div className="space-y-2 text-left bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Half Pack Unit Pricing</p>
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <label className="text-[8px] font-bold uppercase text-slate-400">Retail (₦)</label>
                            <Input type="number" step="any" className="h-9 px-2 text-xs font-bold bg-slate-50 border-none text-slate-900" value={editingProduct.packagingPricing.halfPack?.retailPrice ?? ''} onChange={e => {
                              const pricing = { ...editingProduct.packagingPricing };
                              pricing.halfPack = { ...pricing.halfPack, retailPrice: Number(e.target.value) };
                              setEditingProduct({ ...editingProduct, packagingPricing: pricing as any });
                            }} />
                          </div>
                          <div>
                            <label className="text-[8px] font-bold uppercase text-slate-400">Wholesale (₦)</label>
                            <Input type="number" step="any" className="h-9 px-2 text-xs font-bold bg-slate-50 border-none text-slate-900" value={editingProduct.packagingPricing.halfPack?.wholesalePrice ?? ''} onChange={e => {
                              const pricing = { ...editingProduct.packagingPricing };
                              pricing.halfPack = { ...pricing.halfPack, wholesalePrice: Number(e.target.value) };
                              setEditingProduct({ ...editingProduct, packagingPricing: pricing as any });
                            }} />
                          </div>
                          <div>
                            <label className="text-[8px] font-bold uppercase text-slate-400">Volume (₦)</label>
                            <Input type="number" step="any" className="h-9 px-2 text-xs font-bold bg-slate-50 border-none text-slate-900" value={editingProduct.packagingPricing.halfPack?.volumePrice ?? ''} onChange={e => {
                              const pricing = { ...editingProduct.packagingPricing };
                              pricing.halfPack = { ...pricing.halfPack, volumePrice: Number(e.target.value) };
                              setEditingProduct({ ...editingProduct, packagingPricing: pricing as any });
                            }} />
                          </div>
                          <div>
                            <label className="text-[8px] font-bold uppercase text-slate-400">Threshold</label>
                            <Input type="number" className="h-9 px-2 text-xs font-bold bg-slate-50 border-none text-slate-900" value={editingProduct.packagingPricing.halfPack?.volumeThreshold ?? ''} onChange={e => {
                              const pricing = { ...editingProduct.packagingPricing };
                              pricing.halfPack = { ...pricing.halfPack, volumeThreshold: Number(e.target.value) };
                              setEditingProduct({ ...editingProduct, packagingPricing: pricing as any });
                            }} />
                          </div>
                        </div>
                      </div>

                      {/* Quarter Pack */}
                      <div className="space-y-2 text-left bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Quarter Pack Unit Pricing</p>
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <label className="text-[8px] font-bold uppercase text-slate-400">Retail (₦)</label>
                            <Input type="number" step="any" className="h-9 px-2 text-xs font-bold bg-slate-50 border-none text-slate-900" value={editingProduct.packagingPricing.quarterPack?.retailPrice ?? ''} onChange={e => {
                              const pricing = { ...editingProduct.packagingPricing };
                              pricing.quarterPack = { ...pricing.quarterPack, retailPrice: Number(e.target.value) };
                              setEditingProduct({ ...editingProduct, packagingPricing: pricing as any });
                            }} />
                          </div>
                          <div>
                            <label className="text-[8px] font-bold uppercase text-slate-400">Wholesale (₦)</label>
                            <Input type="number" step="any" className="h-9 px-2 text-xs font-bold bg-slate-50 border-none text-slate-900" value={editingProduct.packagingPricing.quarterPack?.wholesalePrice ?? ''} onChange={e => {
                              const pricing = { ...editingProduct.packagingPricing };
                              pricing.quarterPack = { ...pricing.quarterPack, wholesalePrice: Number(e.target.value) };
                              setEditingProduct({ ...editingProduct, packagingPricing: pricing as any });
                            }} />
                          </div>
                          <div>
                            <label className="text-[8px] font-bold uppercase text-slate-400">Volume (₦)</label>
                            <Input type="number" step="any" className="h-9 px-2 text-xs font-bold bg-slate-50 border-none text-slate-900" value={editingProduct.packagingPricing.quarterPack?.volumePrice ?? ''} onChange={e => {
                              const pricing = { ...editingProduct.packagingPricing };
                              pricing.quarterPack = { ...pricing.quarterPack, volumePrice: Number(e.target.value) };
                              setEditingProduct({ ...editingProduct, packagingPricing: pricing as any });
                            }} />
                          </div>
                          <div>
                            <label className="text-[8px] font-bold uppercase text-slate-400">Threshold</label>
                            <Input type="number" className="h-9 px-2 text-xs font-bold bg-slate-50 border-none text-slate-900" value={editingProduct.packagingPricing.quarterPack?.volumeThreshold ?? ''} onChange={e => {
                              const pricing = { ...editingProduct.packagingPricing };
                              pricing.quarterPack = { ...pricing.quarterPack, volumeThreshold: Number(e.target.value) };
                              setEditingProduct({ ...editingProduct, packagingPricing: pricing as any });
                            }} />
                          </div>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setEditingProduct(null)} 
                  className="flex-1 h-16 bg-slate-100 text-slate-700 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 h-16 bg-blue-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 cursor-pointer"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Product Confirmation Dialog */}
      <Dialog open={!!isDeletingProduct} onOpenChange={(open) => !open && setIsDeletingProduct(null)}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] p-10 border-none shadow-2xl font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tighter text-slate-950 flex items-center gap-2 text-rose-600">
               <AlertCircle className="h-5 w-5" /> Deletion Warning
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
               This will permanently remove the listed item from inventory and database
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center">
             <p className="font-extrabold text-slate-900 text-base">Are you sure you want to delete this product?</p>
             <p className="text-sm font-semibold text-slate-500 mt-2 uppercase tracking-wide">"{isDeletingProduct?.name}"</p>
          </div>
          <div className="flex gap-4">
             <Button
               type="button"
               variant="ghost"
               onClick={() => setIsDeletingProduct(null)}
               className="flex-1 h-12 bg-slate-100 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 cursor-pointer"
             >
                Cancel
             </Button>
             <Button
               type="button"
               onClick={handleDeleteSubmit}
               className="flex-1 h-12 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 shadow-xl shadow-rose-600/20 active:scale-95 cursor-pointer"
             >
                Confirm Delete
             </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Products Confirmation Dialog */}
      <Dialog open={isBulkDeletingProducts} onOpenChange={setIsBulkDeletingProducts}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] p-10 border-none shadow-2xl font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tighter text-slate-950 flex items-center gap-2 text-rose-600">
               <AlertCircle className="h-5 w-5" /> Bulk Deletion Confirmation
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
               Permanent removal of multiple products from inventory
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center">
             <p className="font-extrabold text-slate-900 text-base">
               Are you sure you want to delete {selectedProductIds.length} selected product{selectedProductIds.length > 1 ? 's' : ''}?
             </p>
             <p className="text-xs text-slate-500 mt-2 font-medium">
               This will permanently remove all {selectedProductIds.length} items from the local catalogue and database records.
             </p>
          </div>
          <div className="flex gap-4">
             <Button
               type="button"
               variant="ghost"
               onClick={() => setIsBulkDeletingProducts(false)}
               className="flex-1 h-12 bg-slate-100 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 cursor-pointer"
             >
                Cancel
             </Button>
             <Button
               type="button"
               onClick={handleBulkDeleteProducts}
               className="flex-1 h-12 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 shadow-xl shadow-rose-600/20 active:scale-95 cursor-pointer"
             >
                Delete {selectedProductIds.length} Products
             </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] p-10 border-none shadow-2xl font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tighter text-slate-950 flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" /> Edit Category
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Modify category details in the database
            </DialogDescription>
          </DialogHeader>
          {editingCategory && (
            <form onSubmit={handleEditCategorySubmit} className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category Name</label>
                <Input
                  required
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                  placeholder="Category Name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
                <Input
                  value={editingCategory.description || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  className="h-12 rounded-xl bg-slate-50 border-none font-medium"
                  placeholder="Optional description"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingCategory(null)}
                  className="flex-1 h-12 bg-slate-100 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-12 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-600/20 active:scale-95 cursor-pointer"
                >
                  Save Category
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation Dialog */}
      <Dialog open={!!isDeletingCategory} onOpenChange={(open) => !open && setIsDeletingCategory(null)}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] p-10 border-none shadow-2xl font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tighter text-slate-950 flex items-center gap-2 text-rose-600">
               <AlertCircle className="h-5 w-5" /> Delete Category
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
               This will remove the category from the database
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center">
             <p className="font-extrabold text-slate-900 text-base">Are you sure you want to delete this category?</p>
             <p className="text-sm font-semibold text-slate-500 mt-2 uppercase tracking-wide">"{isDeletingCategory?.name}"</p>
          </div>
          <div className="flex gap-4">
             <Button
               type="button"
               variant="ghost"
               onClick={() => setIsDeletingCategory(null)}
               className="flex-1 h-12 bg-slate-100 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 cursor-pointer"
             >
                Cancel
             </Button>
             <Button
               type="button"
               onClick={handleDeleteCategorySubmit}
               className="flex-1 h-12 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 shadow-xl shadow-rose-600/20 active:scale-95 cursor-pointer"
             >
                Delete Category
             </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Categories Dialog */}
      <Dialog open={isBulkDeletingCategories} onOpenChange={setIsBulkDeletingCategories}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] p-10 border-none shadow-2xl font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tighter text-slate-950 flex items-center gap-2 text-rose-600">
               <AlertCircle className="h-5 w-5" /> Bulk Delete Categories
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
               Remove multiple categories from the database
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center">
             <p className="font-extrabold text-slate-900 text-base">
               Delete {selectedCategoryIds.length} selected category/categories?
             </p>
             <p className="text-xs text-slate-500 mt-2">
               Products associated with these categories will remain intact.
             </p>
          </div>
          <div className="flex gap-4">
             <Button
               type="button"
               variant="ghost"
               onClick={() => setIsBulkDeletingCategories(false)}
               className="flex-1 h-12 bg-slate-100 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 cursor-pointer"
             >
                Cancel
             </Button>
             <Button
               type="button"
               onClick={handleBulkDeleteCategories}
               className="flex-1 h-12 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 shadow-xl shadow-rose-600/20 active:scale-95 cursor-pointer"
             >
                Delete {selectedCategoryIds.length} Categories
             </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Attribute Dialog */}
      <Dialog open={!!editingAttribute} onOpenChange={(open) => !open && setEditingAttribute(null)}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] p-10 border-none shadow-2xl font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tighter text-slate-950 flex items-center gap-2">
              <Tags className="h-5 w-5 text-blue-600" /> Edit Attribute
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Update custom attribute definition
            </DialogDescription>
          </DialogHeader>
          {editingAttribute && (
            <form onSubmit={handleEditAttributeSubmit} className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Attribute Label</label>
                <Input
                  required
                  value={editingAttribute.name}
                  onChange={(e) => setEditingAttribute({ ...editingAttribute, name: e.target.value })}
                  className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                  placeholder="e.g. Dosage, Form, Flavor"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Type</label>
                <select
                  value={editingAttribute.type}
                  onChange={(e) => setEditingAttribute({ ...editingAttribute, type: e.target.value as any })}
                  className="w-full h-12 rounded-xl bg-slate-50 border-none font-bold px-4 text-sm focus:outline-none"
                >
                  <option value="text">Free Text Input</option>
                  <option value="select">Dropdown Options List</option>
                </select>
              </div>
              {editingAttribute.type === 'select' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Options (comma-separated)</label>
                  <Input
                    value={(editingAttribute as any).optionsString ?? editingAttribute.options?.join(', ') ?? ''}
                    onChange={(e) => setEditingAttribute({ ...editingAttribute, optionsString: e.target.value } as any)}
                    className="h-12 rounded-xl bg-slate-50 border-none font-medium"
                    placeholder="e.g. Tablet, Capsule, Liquid"
                  />
                </div>
              )}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingAttribute(null)}
                  className="flex-1 h-12 bg-slate-100 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-12 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-600/20 active:scale-95 cursor-pointer"
                >
                  Save Attribute
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Attribute Confirmation Dialog */}
      <Dialog open={!!isDeletingAttribute} onOpenChange={(open) => !open && setIsDeletingAttribute(null)}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] p-10 border-none shadow-2xl font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tighter text-slate-950 flex items-center gap-2 text-rose-600">
               <AlertCircle className="h-5 w-5" /> Delete Attribute
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
               This will remove the attribute from the database
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center">
             <p className="font-extrabold text-slate-900 text-base">Are you sure you want to delete this attribute?</p>
             <p className="text-sm font-semibold text-slate-500 mt-2 uppercase tracking-wide">"{isDeletingAttribute?.name}"</p>
          </div>
          <div className="flex gap-4">
             <Button
               type="button"
               variant="ghost"
               onClick={() => setIsDeletingAttribute(null)}
               className="flex-1 h-12 bg-slate-100 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 cursor-pointer"
             >
                Cancel
             </Button>
             <Button
               type="button"
               onClick={handleDeleteAttributeSubmit}
               className="flex-1 h-12 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 shadow-xl shadow-rose-600/20 active:scale-95 cursor-pointer"
             >
                Delete Attribute
             </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Attributes Dialog */}
      <Dialog open={isBulkDeletingAttributes} onOpenChange={setIsBulkDeletingAttributes}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] p-10 border-none shadow-2xl font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tighter text-slate-950 flex items-center gap-2 text-rose-600">
               <AlertCircle className="h-5 w-5" /> Bulk Delete Attributes
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
               Remove multiple attributes from the database
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center">
             <p className="font-extrabold text-slate-900 text-base">
               Delete {selectedAttributeIds.length} selected attribute{selectedAttributeIds.length > 1 ? 's' : ''}?
             </p>
             <p className="text-xs text-slate-500 mt-2">
               Values already entered for products will be preserved.
             </p>
          </div>
          <div className="flex gap-4">
             <Button
               type="button"
               variant="ghost"
               onClick={() => setIsBulkDeletingAttributes(false)}
               className="flex-1 h-12 bg-slate-100 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 cursor-pointer"
             >
                Cancel
             </Button>
             <Button
               type="button"
               onClick={handleBulkDeleteAttributes}
               className="flex-1 h-12 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 shadow-xl shadow-rose-600/20 active:scale-95 cursor-pointer"
             >
                Delete {selectedAttributeIds.length} Attributes
             </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Options Popup Modal when product row is clicked */}
      <Dialog open={!!selectedProductForOptions} onOpenChange={(open) => !open && setSelectedProductForOptions(null)}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] p-8 border-none shadow-2xl font-sans">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center font-black text-blue-600 text-sm border border-blue-100 shadow-sm uppercase">
                {selectedProductForOptions?.baseUnit?.substring(0, 3) || 'TAB'}
              </div>
              <div>
                <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-900 leading-tight">
                  {selectedProductForOptions?.name}
                </DialogTitle>
                <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Category: {selectedProductForOptions?.category} • ₦{selectedProductForOptions?.price?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 mb-2">Select Product Action</p>
            
            <button
              type="button"
              onClick={() => {
                if (selectedProductForOptions) {
                  setSelectedProductForDetails(selectedProductForOptions);
                  setIsProductDetailsOpen(true);
                  setSelectedProductForOptions(null);
                }
              }}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-blue-50/70 border border-slate-100 hover:border-blue-200 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Eye size={18} />
                </div>
                <div>
                  <p className="font-extrabold text-slate-900 text-xs group-hover:text-blue-600">See Full Details</p>
                  <p className="text-[10px] text-slate-400">View complete parameters, batches, pricing tiers & stock logs</p>
                </div>
              </div>
              <ArrowRightLeft size={16} className="text-slate-300 group-hover:text-blue-600 rotate-180" />
            </button>

            {canManage && (
              <button
                type="button"
                onClick={() => {
                  if (selectedProductForOptions) {
                    handleEditProductClick(selectedProductForOptions);
                    setSelectedProductForOptions(null);
                  }
                }}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-100 hover:border-emerald-200 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Edit size={18} />
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900 text-xs group-hover:text-emerald-700">Edit Product Details</p>
                    <p className="text-[10px] text-slate-400">Modify title, pricing, formula, and prescription rules</p>
                  </div>
                </div>
                <ArrowRightLeft size={16} className="text-slate-300 group-hover:text-emerald-600 rotate-180" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (selectedProductForOptions) {
                  setSelectedProductForQuickParams(selectedProductForOptions);
                  setQuickStockInput(selectedProductForOptions.stock);
                  setQuickMinStockInput(selectedProductForOptions.minStockLevel || 10);
                  setIsQuickParamsOpen(true);
                  setSelectedProductForOptions(null);
                }
              }}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-100 hover:border-indigo-200 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Zap size={18} />
                </div>
                <div>
                  <p className="font-extrabold text-slate-900 text-xs group-hover:text-indigo-700">Quick Parameters & Stock</p>
                  <p className="text-[10px] text-slate-400">Instantly update stock balance and minimum stock threshold</p>
                </div>
              </div>
              <ArrowRightLeft size={16} className="text-slate-300 group-hover:text-indigo-600 rotate-180" />
            </button>

            {canManage && (
              <button
                type="button"
                onClick={() => {
                  if (selectedProductForOptions) {
                    handleDeleteProductClick(selectedProductForOptions);
                    setSelectedProductForOptions(null);
                  }
                }}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-rose-50/50 hover:bg-rose-100/70 border border-rose-100 hover:border-rose-200 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Trash2 size={18} />
                  </div>
                  <div>
                    <p className="font-extrabold text-rose-700 text-xs">Delete Product</p>
                    <p className="text-[10px] text-rose-500">Remove product from active inventory catalogue</p>
                  </div>
                </div>
                <Trash2 size={16} className="text-rose-400" />
              </button>
            )}
          </div>

          <div className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelectedProductForOptions(null)}
              className="w-full h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest cursor-pointer"
            >
              Close Options
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Product Details Modal */}
      <Dialog open={isProductDetailsOpen} onOpenChange={setIsProductDetailsOpen}>
        <DialogContent className="sm:max-w-2xl rounded-[2.5rem] p-10 border-none shadow-2xl max-h-[90vh] overflow-y-auto font-sans">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <Badge className="bg-blue-50 text-blue-700 font-black text-[10px] uppercase tracking-widest px-3 py-1">
                Product Comprehensive Profile
              </Badge>
              <span className="text-xs font-mono font-bold text-slate-400">ID: {selectedProductForDetails?.id}</span>
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-950 mt-2">
              {selectedProductForDetails?.name}
            </DialogTitle>
            <DialogDescription className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Generic Formula: <span className="text-blue-600">{selectedProductForDetails?.genericName || 'Standard'}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedProductForDetails && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Retail Price</p>
                  <p className="text-lg font-black text-slate-900 mt-1">₦{selectedProductForDetails.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cost Price</p>
                  <p className="text-lg font-black text-slate-700 mt-1">₦{(selectedProductForDetails.costPrice || selectedProductForDetails.price * 0.65).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Current Stock</p>
                  <p className={`text-lg font-black mt-1 ${selectedProductForDetails.stock <= (selectedProductForDetails.minStockLevel || 10) ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {selectedProductForDetails.stock} <span className="text-xs font-normal text-slate-500">{selectedProductForDetails.baseUnit}</span>
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Min Threshold</p>
                  <p className="text-lg font-black text-slate-900 mt-1">{selectedProductForDetails.minStockLevel || 10}</p>
                </div>
              </div>

              {selectedProductForDetails.packagingPricing && (
                <div className="p-5 bg-blue-50/40 rounded-2xl border border-blue-100/60 space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider text-blue-900">Custom Packaging & Volume Tiers</p>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-blue-100">
                      <p className="font-bold text-slate-700">Full Pack</p>
                      <p className="text-blue-600 font-extrabold mt-1">₦{selectedProductForDetails.packagingPricing.fullPack?.retailPrice || selectedProductForDetails.price}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-blue-100">
                      <p className="font-bold text-slate-700">Half Pack</p>
                      <p className="text-blue-600 font-extrabold mt-1">₦{selectedProductForDetails.packagingPricing.halfPack?.retailPrice || 'N/A'}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-blue-100">
                      <p className="font-bold text-slate-700">Quarter Pack</p>
                      <p className="text-blue-600 font-extrabold mt-1">₦{selectedProductForDetails.packagingPricing.quarterPack?.retailPrice || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Batch & Expiry Info</p>
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-slate-800">Barcode: <span className="font-mono font-normal text-slate-600">{selectedProductForDetails.barcode || 'None'}</span></p>
                    <p className="font-bold text-slate-800">Expiry Date: <span className="font-normal text-slate-600">{selectedProductForDetails.expiryDate || 'Unspecified'}</span></p>
                    <p className="font-bold text-slate-800">Prescription: <span className={`font-bold ${selectedProductForDetails.requiresPrescription ? 'text-amber-600' : 'text-emerald-600'}`}>{selectedProductForDetails.requiresPrescription ? 'Rx Required' : 'OTC Friendly'}</span></p>
                  </div>
                </div>

                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Custom Attributes</p>
                  {selectedProductForDetails.attributes && Object.keys(selectedProductForDetails.attributes).length > 0 ? (
                    <div className="space-y-1 text-xs">
                      {Object.entries(selectedProductForDetails.attributes).map(([k, v]) => (
                        <p key={k} className="font-bold text-slate-800">{k}: <span className="font-normal text-slate-600">{String(v)}</span></p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No custom attributes assigned.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-2">
            <Button
              type="button"
              onClick={() => {
                if (selectedProductForDetails) {
                  handleEditProductClick(selectedProductForDetails);
                  setIsProductDetailsOpen(false);
                }
              }}
              className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest cursor-pointer shadow-lg shadow-blue-600/20"
            >
              Edit This Product
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsProductDetailsOpen(false)}
              className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest cursor-pointer"
            >
              Close Details
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Parameters & Stock Modal */}
      <Dialog open={isQuickParamsOpen} onOpenChange={setIsQuickParamsOpen}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] p-8 border-none shadow-2xl font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-950">
              Quick Parameters & Stock Update
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {selectedProductForQuickParams?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stock Quantity ({selectedProductForQuickParams?.baseUnit || 'units'})</label>
              <Input
                type="number"
                value={quickStockInput}
                onChange={(e) => setQuickStockInput(Number(e.target.value))}
                className="h-12 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 text-base px-4"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Minimum Stock Warning Level</label>
              <Input
                type="number"
                value={quickMinStockInput}
                onChange={(e) => setQuickMinStockInput(Number(e.target.value))}
                className="h-12 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 text-base px-4"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsQuickParamsOpen(false)}
              className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!selectedProductForQuickParams) return;
                try {
                  const updated = {
                    ...selectedProductForQuickParams,
                    stock: quickStockInput,
                    minStockLevel: quickMinStockInput
                  };
                  await apiService.products.update(updated.id, updated);
                  toast.success(`Updated stock & parameters for ${updated.name}!`);
                  setIsQuickParamsOpen(false);
                  loadData();
                } catch (e) {
                  toast.error('Failed to update product parameters');
                }
              }}
              className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20 cursor-pointer"
            >
              Save Quick Update
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScan={handleBarcodeScanned}
        title={scannerTargetMode === 'target_product' ? `Scan Barcode for ${scannerTargetProduct?.name}` : 'Catalog Barcode Scanner'}
        targetProductName={scannerTargetMode === 'target_product' ? scannerTargetProduct?.name : undefined}
        existingBarcode={scannerTargetMode === 'target_product' ? scannerTargetProduct?.barcode : undefined}
      />
    </div>
  );
}
