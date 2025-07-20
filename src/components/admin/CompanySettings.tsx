import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

interface CompanySettingsData {
  id?: string;
  company_name: string;
  company_logo_url: string;
  address: string;
  email: string;
  phone_number: string;
  gstin: string;
  make_regular_printer_default: boolean;
  print_repeat_header: boolean;
  paper_size: string;
  orientation: string;
  company_name_text_size: string;
  invoice_text_size: string;
}

export function CompanySettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<CompanySettingsData>({
    company_name: "JEEVUS NATURALS",
    company_logo_url: "",
    address: "Ambipolka Post, Kundara, PIN :691501, Kollam, Kerala, India",
    email: "jeevusnaturals@gmail.com",
    phone_number: "7907983108",
    gstin: "32AREPJ6001D1ZL",
    make_regular_printer_default: false,
    print_repeat_header: false,
    paper_size: "A4",
    orientation: "Portrait",
    company_name_text_size: "Large",
    invoice_text_size: "Medium"
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSettings(data);
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleInputChange = (field: keyof CompanySettingsData, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const settingsData = {
        ...settings,
        created_by: user.id,
        updated_at: new Date().toISOString()
      };

      let query;
      if (settings.id) {
        query = supabase
          .from('company_settings')
          .update(settingsData)
          .eq('id', settings.id);
      } else {
        query = supabase
          .from('company_settings')
          .insert([settingsData]);
      }

      const { error } = await query;
      if (error) throw error;

      toast({
        title: "Success",
        description: "Company settings saved successfully!",
      });

      // Refetch to get the updated data with ID
      await fetchSettings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Print Settings */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="regular-printer"
            checked={settings.make_regular_printer_default}
            onCheckedChange={(checked) => 
              handleInputChange('make_regular_printer_default', checked as boolean)
            }
          />
          <Label htmlFor="regular-printer">Make Regular Printer Default</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="repeat-header"
            checked={settings.print_repeat_header}
            onCheckedChange={(checked) => 
              handleInputChange('print_repeat_header', checked as boolean)
            }
          />
          <Label htmlFor="repeat-header">Print repeat header in all pages</Label>
        </div>
      </div>

      {/* Company Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Company Name</Label>
            <Input
              id="company-name"
              value={settings.company_name}
              onChange={(e) => handleInputChange('company_name', e.target.value)}
              placeholder="Enter company name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-logo">Company Logo</Label>
            <div className="flex items-center gap-2">
              <Input
                id="company-logo"
                value={settings.company_logo_url}
                onChange={(e) => handleInputChange('company_logo_url', e.target.value)}
                placeholder="Enter logo URL"
                className="flex-1"
              />
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Change
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={settings.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Enter company address"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={settings.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter company email"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={settings.phone_number}
              onChange={(e) => handleInputChange('phone_number', e.target.value)}
              placeholder="Enter phone number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gstin">GSTIN or SAC</Label>
            <Input
              id="gstin"
              value={settings.gstin}
              onChange={(e) => handleInputChange('gstin', e.target.value)}
              placeholder="Enter GSTIN or SAC"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paper-size">Paper Size</Label>
            <Select 
              value={settings.paper_size} 
              onValueChange={(value) => handleInputChange('paper_size', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A4">A4</SelectItem>
                <SelectItem value="A5">A5</SelectItem>
                <SelectItem value="Letter">Letter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="orientation">Orientation</Label>
            <Select 
              value={settings.orientation} 
              onValueChange={(value) => handleInputChange('orientation', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Portrait">Portrait</SelectItem>
                <SelectItem value="Landscape">Landscape</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-text-size">Company Name Text Size</Label>
            <Select 
              value={settings.company_name_text_size} 
              onValueChange={(value) => handleInputChange('company_name_text_size', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Small">Small</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Large">Large</SelectItem>
                <SelectItem value="Extra Large">Extra Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoice-text-size">Invoice Text Size</Label>
            <Select 
              value={settings.invoice_text_size} 
              onValueChange={(value) => handleInputChange('invoice_text_size', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Small">Small</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading}>
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}