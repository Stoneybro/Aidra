'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePolicy } from '@/hooks/usePolicy';
import { toast } from 'sonner';
import { z } from 'zod';
import { isAddress } from 'viem';

// Zod schema for policy setup
const policySchema = z.object({
    dailyLimit: z.string()
        .min(1, 'Daily limit is required')
        .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
            message: 'Daily limit must be a positive number'
        }),
    perTxLimit: z.string()
        .min(1, 'Per transaction limit is required')
        .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
            message: 'Per transaction limit must be a positive number'
        }),
    guardianThreshold: z.string()
        .min(1, 'Guardian threshold is required')
        .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
            message: 'Guardian threshold must be a positive number'
        }),
    guardiansRequired: z.string()
        .min(1, 'Number of guardians required')
        .refine((val) => !isNaN(parseInt(val)) && parseInt(val) > 0, {
            message: 'Must be a positive integer'
        }),
    allowedChains: z.string()
        .min(1, 'At least one chain is required')
        .refine((val) => val.split(',').every(chain => chain.trim().length > 0), {
            message: 'All chain names must be non-empty'
        }),
    guardianList: z.string()
        .min(1, 'At least one guardian is required')
        .refine((val) => {
            const addresses = val.split(',').map(addr => addr.trim());
            return addresses.every(addr => isAddress(addr));
        }, {
            message: 'All guardian addresses must be valid Ethereum addresses'
        })
}).refine((data) => {
    const daily = parseFloat(data.dailyLimit);
    const perTx = parseFloat(data.perTxLimit);
    return perTx <= daily;
}, {
    message: 'Per transaction limit must be less than or equal to daily limit',
    path: ['perTxLimit']
}).refine((data) => {
    const perTx = parseFloat(data.perTxLimit);
    const threshold = parseFloat(data.guardianThreshold);
    return threshold <= perTx;
}, {
    message: 'Guardian threshold must be less than or equal to per transaction limit',
    path: ['guardianThreshold']
}).refine((data) => {
    const guardianCount = data.guardianList.split(',').filter(addr => addr.trim()).length;
    const required = parseInt(data.guardiansRequired);
    return required <= guardianCount;
}, {
    message: 'Number of guardians required cannot exceed total guardians provided',
    path: ['guardiansRequired']
});

type PolicyFormData = z.infer<typeof policySchema>;

export function PolicySetupStep() {
    const [formData, setFormData] = useState<PolicyFormData>({
        dailyLimit: '',
        perTxLimit: '',
        guardianThreshold: '',
        guardiansRequired: '',
        allowedChains: '',
        guardianList: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { createPolicy, isLoading } = usePolicy();

    const handleChange = (field: keyof PolicyFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setIsSubmitting(true);

        try {
            // Validate form data
            const validated = policySchema.parse(formData);

            // Parse chains and guardians
            const allowedChains = validated.allowedChains
                .split(',')
                .map(chain => chain.trim().toUpperCase())
                .filter(chain => chain.length > 0);

            const guardianList = validated.guardianList
                .split(',')
                .map(addr => addr.trim().toLowerCase())
                .filter(addr => addr.length > 0);


            // Format ZEC amounts to ensure they have proper decimal places
            const formatZecAmount = (amount: string) => {
                // Ensure the amount has exactly 8 decimal places
                const [whole, decimal = ''] = amount.split('.');
                const paddedDecimal = decimal.padEnd(8, '0').slice(0, 8);
                return `${whole}${paddedDecimal ? `.${paddedDecimal}` : ''}`;
            };




            await createPolicy({
                dailyLimitZec: formatZecAmount(validated.dailyLimit),
                perTxLimitZec: formatZecAmount(validated.perTxLimit),
                guardianThresholdZec: formatZecAmount(validated.guardianThreshold),
                guardiansRequired: parseInt(validated.guardiansRequired),
                allowedChains,
                guardianList
            });

            toast.success('Policy created successfully!');

            setFormData({
                dailyLimit: '',
                perTxLimit: '',
                guardianThreshold: '',
                guardiansRequired: '',
                allowedChains: '',
                guardianList: ''
            });
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                // Handle validation errors
                const fieldErrors: Record<string, string> = {};
                error.issues.forEach((issue) => {
                    if (issue.path && issue.path.length > 0) {
                        const path = issue.path[0] as string;
                        fieldErrors[path] = issue.message;
                    }
                });
                setErrors(fieldErrors);
                toast.error('Please fix the form errors');
            } else {
                console.error('Error creating policy:', error);
                toast.error(error.message || 'Failed to create policy');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-2">Setup Your Security Policy</h2>
            <p className="text-sm text-muted-foreground mb-6">
                Configure limits and guardians for your ZEC bridge operations
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="dailyLimit">Daily Limit (ZEC)</Label>
                    <Input
                        id="dailyLimit"
                        type="text"
                        value={formData.dailyLimit}
                        onChange={(e) => handleChange('dailyLimit', e.target.value)}
                        placeholder="e.g., 10.5"
                        className={errors.dailyLimit ? 'border-red-500' : ''}
                    />
                    {errors.dailyLimit && (
                        <p className="text-sm text-red-500">{errors.dailyLimit}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Maximum amount you can bridge per day
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="perTxLimit">Per Transaction Limit (ZEC)</Label>
                    <Input
                        id="perTxLimit"
                        type="text"
                        value={formData.perTxLimit}
                        onChange={(e) => handleChange('perTxLimit', e.target.value)}
                        placeholder="e.g., 5.0"
                        className={errors.perTxLimit ? 'border-red-500' : ''}
                    />
                    {errors.perTxLimit && (
                        <p className="text-sm text-red-500">{errors.perTxLimit}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Maximum amount per single transaction
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="guardianThreshold">Guardian Threshold (ZEC)</Label>
                    <Input
                        id="guardianThreshold"
                        type="text"
                        value={formData.guardianThreshold}
                        onChange={(e) => handleChange('guardianThreshold', e.target.value)}
                        placeholder="e.g., 2.0"
                        className={errors.guardianThreshold ? 'border-red-500' : ''}
                    />
                    {errors.guardianThreshold && (
                        <p className="text-sm text-red-500">{errors.guardianThreshold}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Amounts above this require guardian approval
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="guardiansRequired">Number of Guardians Required</Label>
                    <Input
                        id="guardiansRequired"
                        type="number"
                        min="1"
                        value={formData.guardiansRequired}
                        onChange={(e) => handleChange('guardiansRequired', e.target.value)}
                        placeholder="e.g., 2"
                        className={errors.guardiansRequired ? 'border-red-500' : ''}
                    />
                    {errors.guardiansRequired && (
                        <p className="text-sm text-red-500">{errors.guardiansRequired}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                        How many guardians must approve high-value transactions
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="allowedChains">Allowed Chains (comma-separated)</Label>
                    <Input
                        id="allowedChains"
                        type="text"
                        value={formData.allowedChains}
                        onChange={(e) => handleChange('allowedChains', e.target.value)}
                        placeholder="e.g., NEAR,Ethereum,Polygon"
                        className={errors.allowedChains ? 'border-red-500' : ''}
                    />
                    {errors.allowedChains && (
                        <p className="text-sm text-red-500">{errors.allowedChains}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Destination chains you can bridge to
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="guardianList">Guardian Addresses (comma-separated)</Label>
                    <Input
                        id="guardianList"
                        type="text"
                        value={formData.guardianList}
                        onChange={(e) => handleChange('guardianList', e.target.value)}
                        placeholder="0x123...,0x456..."
                        className={errors.guardianList ? 'border-red-500' : ''}
                    />
                    {errors.guardianList && (
                        <p className="text-sm text-red-500">{errors.guardianList}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Trusted addresses that can approve high-value transactions
                    </p>
                </div>

                <Button
                    type="submit"
                    className="w-full mt-6"
                    disabled={isLoading || isSubmitting}
                >
                    {isLoading || isSubmitting ? 'Creating Policy...' : 'Create Policy'}
                </Button>
            </form>
        </div>
    );
}