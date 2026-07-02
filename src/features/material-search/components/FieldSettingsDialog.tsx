import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
  IconButton,
  TextField
} from '@mui/material';
import { Close as CloseIcon, SettingsBackupRestore } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useRecoilState } from 'recoil';
import { activeSearchFieldsState, activeOutputFieldsState, activeCompareFieldsState } from '../state/search.state';
import { useSearchFieldsQuery, useOutputFieldsQuery } from '../hooks/useMaterialSearch';

interface FieldSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2, height: 380, overflowY: 'auto', scrollbarGutter: 'stable' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export function FieldSettingsDialog({ open, onClose }: FieldSettingsDialogProps) {
  const { t } = useTranslation();
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: searchFields } = useSearchFieldsQuery();
  const { data: outputFields } = useOutputFieldsQuery();

  const [activeSearchFields, setActiveSearchFields] = useRecoilState(activeSearchFieldsState);
  const [activeOutputFields, setActiveOutputFields] = useRecoilState(activeOutputFieldsState);
  const [activeCompareFields, setActiveCompareFields] = useRecoilState(activeCompareFieldsState);

  // Initialize if null
  useEffect(() => {
    if (open && searchFields && activeSearchFields === null) {
      setActiveSearchFields(searchFields.map(f => f.field_name));
    }
  }, [open, searchFields, activeSearchFields, setActiveSearchFields]);

  useEffect(() => {
    if (open && outputFields && activeOutputFields === null) {
      setActiveOutputFields(outputFields.map(f => f.field_name));
    }
  }, [open, outputFields, activeOutputFields, setActiveOutputFields]);

  useEffect(() => {
    if (open && outputFields && activeCompareFields === null) {
      setActiveCompareFields(outputFields.map(f => f.field_name));
    }
  }, [open, outputFields, activeCompareFields, setActiveCompareFields]);

  // Reset search query on close
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only Hebrew characters, spaces, digits, and basic punctuation
    const hebrewValue = value.replace(/[^ \u0590-\u05FF\d\(\)\-\:\.]/g, '');
    setSearchQuery(hebrewValue);
  };

  const handleSearchFieldToggle = (fieldName: string) => {
    if (!activeSearchFields) return;
    const currentIndex = activeSearchFields.indexOf(fieldName);
    const newChecked = [...activeSearchFields];

    if (currentIndex === -1) {
      newChecked.push(fieldName);
    } else {
      newChecked.splice(currentIndex, 1);
    }

    // Keep the original order of fields
    const orderedChecked = searchFields
      ?.map(f => f.field_name)
      .filter(n => newChecked.includes(n)) || [];
      
    setActiveSearchFields(orderedChecked);
  };

  const handleOutputFieldToggle = (fieldName: string) => {
    if (!activeOutputFields) return;
    const currentIndex = activeOutputFields.indexOf(fieldName);
    const newChecked = [...activeOutputFields];

    if (currentIndex === -1) {
      newChecked.push(fieldName);
    } else {
      newChecked.splice(currentIndex, 1);
    }

    // Keep the original order of columns
    const orderedChecked = outputFields
      ?.map(f => f.field_name)
      .filter(n => newChecked.includes(n)) || [];

    setActiveOutputFields(orderedChecked);
  };

  const handleCompareFieldToggle = (fieldName: string) => {
    if (!activeCompareFields) return;
    const currentIndex = activeCompareFields.indexOf(fieldName);
    const newChecked = [...activeCompareFields];

    if (currentIndex === -1) {
      newChecked.push(fieldName);
    } else {
      newChecked.splice(currentIndex, 1);
    }

    const orderedChecked = outputFields
      ?.map(f => f.field_name)
      .filter(n => newChecked.includes(n)) || [];

    setActiveCompareFields(orderedChecked);
  };

  const handleReset = () => {
    if (searchFields) setActiveSearchFields(searchFields.map(f => f.field_name));
    // null = "show all columns" — URL will cleanly drop the ?f= param
    setActiveOutputFields(null);
    setActiveCompareFields(null);
  };

  const filteredSearchFields = searchFields?.filter((field) => {
    const label = t(field.hebrew_desc).toLowerCase();
    return label.includes(searchQuery.toLowerCase());
  });

  const filteredOutputFields = outputFields?.filter((field) => {
    const label = t(field.hebrew_desc).toLowerCase();
    return label.includes(searchQuery.toLowerCase());
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {t('materialSearch.settings.title', 'הגדרות תצוגה')}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ color: (theme) => theme.palette.grey[500] }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="field settings tabs" centered>
            <Tab label={t('materialSearch.settings.searchFields', 'שדות לחיפוש')} />
            <Tab label={t('materialSearch.settings.outputColumns', 'עמודות לתוצאה')} />
            <Tab label={t('materialSearch.settings.compareFields', 'שדות להשוואה')} />
          </Tabs>
        </Box>
        <Box sx={{ p: 2, pb: 0 }}>
          <TextField
            fullWidth
            size="small"
            variant="outlined"
            placeholder="חפש שדה בעברית בלבד..."
            value={searchQuery}
            onChange={handleSearchChange}
            autoComplete="off"
          />
        </Box>
        <CustomTabPanel value={tabValue} index={0}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            בחר אילו שדות יופיעו בחלונית הסינון:
          </Typography>
          <FormGroup>
            {filteredSearchFields?.map((field) => (
              <FormControlLabel
                key={field.field_name}
                control={
                  <Checkbox 
                    checked={activeSearchFields ? activeSearchFields.includes(field.field_name) : true}
                    onChange={() => handleSearchFieldToggle(field.field_name)}
                  />
                }
                label={t(field.hebrew_desc)}
              />
            ))}
          </FormGroup>
        </CustomTabPanel>
        <CustomTabPanel value={tabValue} index={1}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            בחר אילו עמודות יופיעו בטבלת התוצאות:
          </Typography>
          <FormGroup>
            {filteredOutputFields?.map((field) => (
              <FormControlLabel
                key={field.field_name}
                control={
                  <Checkbox 
                    checked={activeOutputFields ? activeOutputFields.includes(field.field_name) : true}
                    onChange={() => handleOutputFieldToggle(field.field_name)}
                  />
                }
                label={t(field.hebrew_desc)}
              />
            ))}
          </FormGroup>
        </CustomTabPanel>
        <CustomTabPanel value={tabValue} index={2}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            בחר אילו שדות יופיעו במסך ההשוואה:
          </Typography>
          <FormGroup>
            {filteredOutputFields?.map((field) => (
              <FormControlLabel
                key={field.field_name}
                control={
                  <Checkbox 
                    checked={activeCompareFields ? activeCompareFields.includes(field.field_name) : true}
                    onChange={() => handleCompareFieldToggle(field.field_name)}
                  />
                }
                label={t(field.hebrew_desc)}
              />
            ))}
          </FormGroup>
        </CustomTabPanel>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', p: 2 }}>
        <Button 
          color="inherit" 
          startIcon={<SettingsBackupRestore />} 
          onClick={handleReset}
        >
          {t('materialSearch.settings.resetDefaults', 'שחזר לברירת מחדל')}
        </Button>
        <Button onClick={onClose} variant="contained" color="primary">
          סגור
        </Button>
      </DialogActions>
    </Dialog>
  );
}
