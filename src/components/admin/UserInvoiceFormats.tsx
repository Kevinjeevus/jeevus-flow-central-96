import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Save, User, FileText, Eye, EyeOff, Palette, Type, Search, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

interface InvoiceFormat {
  id?: string;
  user_id: string;
  format_name: string;
  show_company_logo: boolean;
  show_company_name: boolean;
  show_company_address: boolean;
  show_company_phone: boolean;
  show_gstin: boolean;
  invoice_title: string;
  show_hsn_column: boolean;
  show_gst_column: boolean;
  show_unit_column: boolean;
  show_discount_column: boolean;
  show_bank_details: boolean;
  show_terms: boolean;
  show_signature: boolean;
  show_hsn_summary: boolean;
  show_amount_in_words: boolean;
  show_previous_due: boolean;
  custom_terms_text: string;
  custom_footer_text: string;
  custom_signatory_name: string;
  primary_color: string;
  accent_color: string;
  font_size: string;
  paper_size: string;
  orientation: string;
}

interface UserInfo {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  employee_id?: string;
}

const DEFAULT_FORMAT: Omit<InvoiceFormat, 'user_id'> = {
  format_name: 'Default',
  show_company_logo: true,
  show_company_name: true,
  show_company_address: true,
  show_company_phone: true,
  show_gstin: true,
  invoice_title: 'TAX INVOICE',
  show_hsn_column: true,
  show_gst_column: true,
  show_unit_column: true,
  show_discount_column: false,
  show_bank_details: true,
  show_terms: true,
  show_signature: true,
  show_hsn_summary: true,
  show_amount_in_words: true,
  show_previous_due: false,
  custom_terms_text: 'Thanks for doing business with us!',
  custom_footer_text: 'Thank you for your business!',
  custom_signatory_name: '',
  primary_color: '#333333',
  accent_color: '#f5f5f5',
  font_size: 'medium',
  paper_size: 'A4',
  orientation: 'portrait',
};

export function UserInvoiceFormats() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [format, setFormat] = useState<InvoiceFormat | null>(null);
  const [existingFormats, setExistingFormats] = useState<Record<string, InvoiceFormat>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copyFromUserId, setCopyFromUserId] = useState("");

  useEffect(() => {
    fetchUsers();
    fetchAllFormats();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadFormatForUser(selectedUserId);
    }
  }, [selectedUserId]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Get profiles (users who have access)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, role');

      if (profilesError) throw profilesError;

      // Also get user_roles for more role info
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Get employee info
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('user_id, full_name, employee_id')
        .not('user_id', 'is', null);

      if (empError) throw empError;

      // Build user list
      const userMap = new Map<string, UserInfo>();

      // Add from profiles
      (profiles || []).forEach((p: any) => {
        userMap.set(p.user_id, {
          user_id: p.user_id,
          full_name: p.full_name || p.email,
          email: p.email,
          role: p.role || 'employee',
        });
      });

      // Update roles from user_roles table
      (roles || []).forEach((r: any) => {
        if (userMap.has(r.user_id)) {
          const existing = userMap.get(r.user_id)!;
          // Use highest role
          if (r.role === 'admin' || (r.role === 'hr' && existing.role !== 'admin')) {
            existing.role = r.role;
          }
        }
      });

      // Add employee IDs
      (employees || []).forEach((e: any) => {
        if (e.user_id && userMap.has(e.user_id)) {
          userMap.get(e.user_id)!.employee_id = e.employee_id;
          // Use employee name if profile doesn't have it
          if (!userMap.get(e.user_id)!.full_name) {
            userMap.get(e.user_id)!.full_name = e.full_name;
          }
        }
      });

      setUsers(Array.from(userMap.values()).sort((a, b) => {
        // Sort admin first, then by name
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (b.role === 'admin' && a.role !== 'admin') return 1;
        return a.full_name.localeCompare(b.full_name);
      }));
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllFormats = async () => {
    try {
      const { data, error } = await supabase
        .from('user_invoice_formats')
        .select('*');

      if (error) throw error;

      const formatMap: Record<string, InvoiceFormat> = {};
      (data || []).forEach((f: any) => {
        formatMap[f.user_id] = f;
      });
      setExistingFormats(formatMap);
    } catch (error: any) {
      console.error('Error fetching formats:', error);
    }
  };

  const loadFormatForUser = (userId: string) => {
    if (existingFormats[userId]) {
      setFormat(existingFormats[userId]);
    } else {
      setFormat({
        ...DEFAULT_FORMAT,
        user_id: userId,
      });
    }
  };

  const handleCopyFrom = () => {
    if (!copyFromUserId || !selectedUserId) return;
    const sourceFormat = existingFormats[copyFromUserId];
    if (sourceFormat) {
      setFormat({
        ...sourceFormat,
        id: format?.id, // Keep existing ID if editing
        user_id: selectedUserId,
      });
      toast({
        title: "Format Copied",
        description: "Settings copied from selected user. Save to apply.",
      });
    } else {
      toast({
        title: "No Format Found",
        description: "Selected user doesn't have a custom format yet.",
        variant: "destructive",
      });
    }
    setCopyFromUserId("");
  };

  const updateField = (field: keyof InvoiceFormat, value: any) => {
    if (!format) return;
    setFormat({ ...format, [field]: value });
  };

  const handleSave = async () => {
    if (!format || !user) return;

    setIsSaving(true);
    try {
      const saveData = {
        user_id: format.user_id,
        format_name: format.format_name,
        show_company_logo: format.show_company_logo,
        show_company_name: format.show_company_name,
        show_company_address: format.show_company_address,
        show_company_phone: format.show_company_phone,
        show_gstin: format.show_gstin,
        invoice_title: format.invoice_title,
        show_hsn_column: format.show_hsn_column,
        show_gst_column: format.show_gst_column,
        show_unit_column: format.show_unit_column,
        show_discount_column: format.show_discount_column,
        show_bank_details: format.show_bank_details,
        show_terms: format.show_terms,
        show_signature: format.show_signature,
        show_hsn_summary: format.show_hsn_summary,
        show_amount_in_words: format.show_amount_in_words,
        show_previous_due: format.show_previous_due,
        custom_terms_text: format.custom_terms_text,
        custom_footer_text: format.custom_footer_text,
        custom_signatory_name: format.custom_signatory_name,
        primary_color: format.primary_color,
        accent_color: format.accent_color,
        font_size: format.font_size,
        paper_size: format.paper_size,
        orientation: format.orientation,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      };

      let query;
      if (format.id) {
        query = supabase
          .from('user_invoice_formats')
          .update(saveData)
          .eq('id', format.id);
      } else {
        query = supabase
          .from('user_invoice_formats')
          .insert([saveData]);
      }

      const { error } = await query;
      if (error) throw error;

      toast({
        title: "Success",
        description: `Invoice format saved for ${users.find(u => u.user_id === format.user_id)?.full_name || 'user'}`,
      });

      // Refresh formats
      await fetchAllFormats();
      // Reload current
      if (selectedUserId) {
        const { data: refreshed } = await supabase
          .from('user_invoice_formats')
          .select('*')
          .eq('user_id', selectedUserId)
          .maybeSingle();
        if (refreshed) {
          setFormat(refreshed);
          setExistingFormats(prev => ({ ...prev, [selectedUserId]: refreshed }));
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save format",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      admin: "default",
      hr: "secondary",
      sales: "secondary",
      employee: "outline",
    };
    return (
      <Badge variant={variants[role] || "outline"} className="text-[10px] px-1.5 py-0">
        {role.toUpperCase()}
      </Badge>
    );
  };

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.employee_id && u.employee_id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* User Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Select User
              </CardTitle>
              <CardDescription className="text-xs">
                Choose a user to configure their invoice format
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {isLoading ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">Loading users...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">No users found</div>
                ) : (
                  filteredUsers.map((u) => (
                    <button
                      key={u.user_id}
                      onClick={() => setSelectedUserId(u.user_id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedUserId === u.user_id
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-transparent hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{u.full_name}</div>
                          <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                          {u.employee_id && (
                            <div className="text-xs text-muted-foreground">ID: {u.employee_id}</div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
                          {getRoleBadge(u.role)}
                          {existingFormats[u.user_id] && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 text-green-600 border-green-300">
                              CONFIGURED
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Format Settings */}
        <div className="lg:col-span-2">
          {!selectedUserId ? (
            <Card>
              <CardContent className="py-16 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">Select a user from the left to configure their invoice format</p>
              </CardContent>
            </Card>
          ) : format ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">
                    {users.find(u => u.user_id === selectedUserId)?.full_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Configure invoice format for this user
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Format"}
                  </Button>
                </div>
              </div>

              {/* Copy from another user */}
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Copy format from another user</Label>
                      <Select value={copyFromUserId} onValueChange={setCopyFromUserId}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select user to copy from..." />
                        </SelectTrigger>
                        <SelectContent>
                          {users
                            .filter(u => u.user_id !== selectedUserId && existingFormats[u.user_id])
                            .map(u => (
                              <SelectItem key={u.user_id} value={u.user_id}>
                                {u.full_name} ({u.role})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyFrom}
                      disabled={!copyFromUserId}
                      className="h-9"
                    >
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      Copy
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Format Name & Title */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Basic Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Format Name</Label>
                      <Input
                        value={format.format_name}
                        onChange={(e) => updateField('format_name', e.target.value)}
                        placeholder="e.g., Admin Format, Staff Format"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Invoice Title</Label>
                      <Input
                        value={format.invoice_title}
                        onChange={(e) => updateField('invoice_title', e.target.value)}
                        placeholder="e.g., TAX INVOICE, SALES INVOICE"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Header Visibility */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Header Visibility
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Control what appears in the invoice header
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                      { key: 'show_company_logo', label: 'Company Logo' },
                      { key: 'show_company_name', label: 'Company Name' },
                      { key: 'show_company_address', label: 'Company Address' },
                      { key: 'show_company_phone', label: 'Phone Number' },
                      { key: 'show_gstin', label: 'GSTIN Number' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-2">
                        <Checkbox
                          id={`header-${key}`}
                          checked={format[key as keyof InvoiceFormat] as boolean}
                          onCheckedChange={(checked) => updateField(key as keyof InvoiceFormat, checked)}
                        />
                        <Label htmlFor={`header-${key}`} className="text-sm cursor-pointer">
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Column Visibility */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <EyeOff className="h-4 w-4" />
                    Table Columns
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Choose which columns appear in the items table
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { key: 'show_hsn_column', label: 'HSN/SAC' },
                      { key: 'show_gst_column', label: 'GST %' },
                      { key: 'show_unit_column', label: 'Unit' },
                      { key: 'show_discount_column', label: 'Discount' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-2">
                        <Checkbox
                          id={`col-${key}`}
                          checked={format[key as keyof InvoiceFormat] as boolean}
                          onCheckedChange={(checked) => updateField(key as keyof InvoiceFormat, checked)}
                        />
                        <Label htmlFor={`col-${key}`} className="text-sm cursor-pointer">
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Footer Sections */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Footer Sections
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Control which sections appear at the bottom of the invoice
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                      { key: 'show_bank_details', label: 'Bank Details' },
                      { key: 'show_terms', label: 'Terms & Conditions' },
                      { key: 'show_signature', label: 'Signature Block' },
                      { key: 'show_hsn_summary', label: 'HSN Tax Breakdown' },
                      { key: 'show_amount_in_words', label: 'Amount in Words' },
                      { key: 'show_previous_due', label: 'Previous Due' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-2">
                        <Checkbox
                          id={`footer-${key}`}
                          checked={format[key as keyof InvoiceFormat] as boolean}
                          onCheckedChange={(checked) => updateField(key as keyof InvoiceFormat, checked)}
                        />
                        <Label htmlFor={`footer-${key}`} className="text-sm cursor-pointer">
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Custom texts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Terms & Conditions Text</Label>
                      <Textarea
                        value={format.custom_terms_text}
                        onChange={(e) => updateField('custom_terms_text', e.target.value)}
                        placeholder="Enter terms text..."
                        rows={2}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Footer Text</Label>
                      <Textarea
                        value={format.custom_footer_text}
                        onChange={(e) => updateField('custom_footer_text', e.target.value)}
                        placeholder="Enter footer text..."
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Authorized Signatory Name</Label>
                    <Input
                      value={format.custom_signatory_name}
                      onChange={(e) => updateField('custom_signatory_name', e.target.value)}
                      placeholder="Leave empty to use company name"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Styling */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Styling
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Primary Color</Label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={format.primary_color}
                          onChange={(e) => updateField('primary_color', e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border"
                        />
                        <Input
                          value={format.primary_color}
                          onChange={(e) => updateField('primary_color', e.target.value)}
                          className="flex-1 h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Accent Color</Label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={format.accent_color}
                          onChange={(e) => updateField('accent_color', e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border"
                        />
                        <Input
                          value={format.accent_color}
                          onChange={(e) => updateField('accent_color', e.target.value)}
                          className="flex-1 h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Font Size</Label>
                      <Select value={format.font_size} onValueChange={(v) => updateField('font_size', v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="large">Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Paper Size</Label>
                      <Select value={format.paper_size} onValueChange={(v) => updateField('paper_size', v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A4">A4</SelectItem>
                          <SelectItem value="A5">A5</SelectItem>
                          <SelectItem value="Letter">Letter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Save Button (bottom) */}
              <div className="flex justify-end pt-2">
                <Button onClick={handleSave} disabled={isSaving} size="lg">
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Invoice Format"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
