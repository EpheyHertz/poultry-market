'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft,
  Phone,
  History,
  TrendingUp,
  Users,
  Gift,
  Loader2,
  Copy,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Heart,
  MessageSquare,
  Building2,
  CreditCard,
  Landmark
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatCurrency';

// Withdrawal method types
type WithdrawalMethod = 'MPESA_B2C' | 'MPESA_B2B_PAYBILL' | 'MPESA_B2B_TILL' | 'BANK';

// Bank codes for Kenya
const BANK_OPTIONS = [
  { code: '68', name: 'Equity Bank' },
  { code: '1', name: 'KCB Bank' },
  { code: '11', name: 'Co-operative Bank' },
  { code: '3', name: 'ABSA (Barclays)' },
  { code: '31', name: 'Stanbic Bank' },
  { code: '63', name: 'Diamond Trust Bank' },
  { code: '7', name: 'NCBA Bank' },
  { code: '2', name: 'Standard Chartered' },
  { code: '70', name: 'Family Bank' },
  { code: '66', name: 'Sidian Bank' },
  { code: '57', name: 'I&M Bank' },
  { code: '12', name: 'National Bank' },
  { code: '10', name: 'Prime Bank' },
  { code: '19', name: 'Bank of Africa' },
  { code: '35', name: 'ABC Bank' },
  { code: '25', name: 'Credit Bank' },
  { code: '54', name: 'Victoria Commercial Bank' },
  { code: '74', name: 'First Community Bank' },
  { code: '78', name: 'KWFT Bank' },
  { code: '55', name: 'Guardian Bank' },
  { code: '61', name: 'HFC Ltd (HFCK)' },
];

interface WalletData {
  id: string;
  intasendWalletId: string;
  availableBalance: number;
  pendingBalance: number;
  totalReceived: number;
  totalWithdrawn: number;
  mpesaNumber: string | null;
  status: string;
}

interface Transaction {
  id: string;
  amount: number;
  netAmount: number;
  platformFee: number;
  supporterName: string | null;
  supporterEmail: string | null;
  message: string | null;
  status: string;
  createdAt: string;
  blogPost?: {
    title: string;
    slug: string;
  };
}

interface Withdrawal {
  id: string;
  amount: number;
  method: string;
  destination: string;
  mpesaNumber: string | null;
  bankAccount: string | null;
  bankName: string | null;
  status: string;
  statusCode: string | null;
  createdAt: string;
  processedAt: string | null;
  failedReason: string | null;
  mpesaReference: string | null;
}

interface DashboardData {
  authorProfileId: string;
  wallet: WalletData;
  stats: {
    totalSupporters: number;
    thisMonthAmount: number;
    averageSupport: number;
    topSupportedPost: string | null;
  };
  recentTransactions: Transaction[];
}

export default function AuthorSupportDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [newMpesaNumber, setNewMpesaNumber] = useState('');
  
  // New withdrawal method states
  const [withdrawMethod, setWithdrawMethod] = useState<WithdrawalMethod>('MPESA_B2C');
  const [paybillNumber, setPaybillNumber] = useState('');
  const [paybillAccount, setPaybillAccount] = useState('');
  const [tillNumber, setTillNumber] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [accountName, setAccountName] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [walletRes, withdrawalsRes] = await Promise.all([
        fetch('/api/author/wallet'),
        fetch('/api/author/wallet/withdraw'),
      ]);

      if (walletRes.status === 404) {
        router.push('/author/support/setup');
        return;
      }

      if (!walletRes.ok) {
        throw new Error('Failed to fetch wallet data');
      }

      const walletData = await walletRes.json();
      setData(walletData);

      if (withdrawalsRes.ok) {
        const withdrawalsData = await withdrawalsRes.json();
        setWithdrawals(withdrawalsData.withdrawals || []);
      }

      if (walletData.wallet?.mpesaNumber) {
        setNewMpesaNumber(walletData.wallet.mpesaNumber);
        setWithdrawPhone(walletData.wallet.mpesaNumber);
      }

    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [router, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
    toast({
      title: 'Refreshed',
      description: 'Dashboard data updated',
    });
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    
    // Validate common fields
    if (!withdrawAmount || isNaN(amount)) {
      toast({
        title: 'Error',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    // Method-specific validation
    const minAmount = withdrawMethod === 'BANK' ? 100 : 200;
    if (amount < minAmount) {
      toast({
        title: 'Error',
        description: `Minimum withdrawal is KES ${minAmount}`,
        variant: 'destructive',
      });
      return;
    }

    if (withdrawMethod === 'BANK' && amount > 999999) {
      toast({
        title: 'Error',
        description: 'Maximum bank withdrawal is KES 999,999',
        variant: 'destructive',
      });
      return;
    }

    if (data && amount > data.wallet.availableBalance) {
      toast({
        title: 'Error',
        description: 'Insufficient balance',
        variant: 'destructive',
      });
      return;
    }

    // Validate method-specific required fields
    switch (withdrawMethod) {
      case 'MPESA_B2C':
        if (!withdrawPhone) {
          toast({ title: 'Error', description: 'Please enter M-Pesa phone number', variant: 'destructive' });
          return;
        }
        break;
      case 'MPESA_B2B_PAYBILL':
        if (!paybillNumber || !paybillAccount) {
          toast({ title: 'Error', description: 'Please enter PayBill number and account', variant: 'destructive' });
          return;
        }
        break;
      case 'MPESA_B2B_TILL':
        if (!tillNumber) {
          toast({ title: 'Error', description: 'Please enter Till number', variant: 'destructive' });
          return;
        }
        break;
      case 'BANK':
        if (!bankCode || !bankAccount || !accountName) {
          toast({ title: 'Error', description: 'Please fill all bank details', variant: 'destructive' });
          return;
        }
        break;
    }

    setIsWithdrawing(true);
    try {
      // Build request body based on method
      const requestBody: Record<string, unknown> = {
        amount,
        method: withdrawMethod,
      };

      switch (withdrawMethod) {
        case 'MPESA_B2C':
          requestBody.mpesaNumber = withdrawPhone;
          break;
        case 'MPESA_B2B_PAYBILL':
          requestBody.paybillNumber = paybillNumber;
          requestBody.paybillAccount = paybillAccount;
          break;
        case 'MPESA_B2B_TILL':
          requestBody.tillNumber = tillNumber;
          break;
        case 'BANK':
          requestBody.bankCode = bankCode;
          requestBody.bankAccount = bankAccount;
          requestBody.accountName = accountName;
          requestBody.bankName = BANK_OPTIONS.find(b => b.code === bankCode)?.name || '';
          break;
      }

      const response = await fetch('/api/author/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Withdrawal failed');
      }

      // Build success message based on method
      let destinationMsg = '';
      switch (withdrawMethod) {
        case 'MPESA_B2C':
          destinationMsg = withdrawPhone;
          break;
        case 'MPESA_B2B_PAYBILL':
          destinationMsg = `PayBill ${paybillNumber}`;
          break;
        case 'MPESA_B2B_TILL':
          destinationMsg = `Till ${tillNumber}`;
          break;
        case 'BANK':
          destinationMsg = `${BANK_OPTIONS.find(b => b.code === bankCode)?.name || 'Bank'}`;
          break;
      }

      toast({
        title: 'Withdrawal Initiated',
        description: `KES ${amount} is being sent to ${destinationMsg}`,
      });

      setWithdrawAmount('');
      await fetchData();

    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Withdrawal failed',
        variant: 'destructive',
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleUpdateSettings = async () => {
    setIsUpdatingSettings(true);
    try {
      const response = await fetch('/api/author/wallet', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mpesaNumber: newMpesaNumber,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      toast({
        title: 'Settings Updated',
        description: 'Your M-Pesa number has been updated',
      });

      await fetchData();

    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const copyShareLink = () => {
    if (data?.authorProfileId) {
      const link = `${window.location.origin}/support/${data.authorProfileId}`;
      navigator.clipboard.writeText(link);
      toast({
        title: 'Link Copied!',
        description: 'Share this link to receive support',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Wallet Not Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You haven&apos;t set up your support wallet yet.
            </p>
            <Button onClick={() => router.push('/author/support/setup')}>
              Set Up Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Wallet className="h-8 w-8 text-emerald-500" />
              Support Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your reader support and withdrawals
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={copyShareLink}>
              <Copy className="h-4 w-4 mr-2" />
              Share Link
            </Button>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-emerald-100">Available Balance</span>
                  <Wallet className="h-5 w-5 text-emerald-200" />
                </div>
                <div className="text-3xl font-bold">
                  {formatCurrency(data.wallet.availableBalance)}
                </div>
                {data.wallet.pendingBalance > 0 && (
                  <div className="text-sm text-emerald-200 mt-1">
                    +{formatCurrency(data.wallet.pendingBalance)} pending
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 dark:text-gray-400">This Month</span>
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(data.stats.thisMonthAmount)}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Total Supporters</span>
                  <Users className="h-5 w-5 text-purple-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {data.stats.totalSupporters}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Average Support</span>
                  <Gift className="h-5 w-5 text-pink-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(data.stats.averageSupport)}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <ArrowDownLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Received</span>
            </TabsTrigger>
            <TabsTrigger value="withdraw" className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" />
              <span className="hidden sm:inline">Withdraw</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  Recent Support
                </CardTitle>
                <CardDescription>
                  Support received from your readers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.recentTransactions.length === 0 ? (
                  <div className="text-center py-12">
                    <Gift className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No support received yet. Share your posts to start receiving support!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.recentTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-start justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-semibold">
                            {(tx.supporterName || 'A')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {tx.supporterName || 'Anonymous'}
                            </div>
                            {tx.message && (
                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-start gap-1">
                                <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>&ldquo;{tx.message}&rdquo;</span>
                              </div>
                            )}
                            {tx.blogPost && (
                              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                On: {tx.blogPost.title}
                              </div>
                            )}
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              {new Date(tx.createdAt).toLocaleDateString('en-KE', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                            +{formatCurrency(tx.netAmount)}
                          </div>
                          {tx.platformFee > 0 && (
                            <div className="text-xs text-gray-500">
                              ({formatCurrency(tx.amount)} - {formatCurrency(tx.platformFee)} fee)
                            </div>
                          )}
                          {getStatusBadge(tx.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Withdraw Tab */}
          <TabsContent value="withdraw">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowUpRight className="h-5 w-5 text-emerald-500" />
                    Withdraw Funds
                  </CardTitle>
                  <CardDescription>
                    {withdrawMethod === 'BANK' 
                      ? 'Min: KES 100 | Max: KES 999,999' 
                      : 'Min: KES 200 | Daily limit: KES 50,000'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Available to withdraw</div>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(data.wallet.availableBalance)}
                    </div>
                  </div>

                  {/* Withdrawal Method Selection */}
                  <div className="space-y-2">
                    <Label>Withdrawal Method</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={withdrawMethod === 'MPESA_B2C' ? 'default' : 'outline'}
                        className={withdrawMethod === 'MPESA_B2C' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                        onClick={() => setWithdrawMethod('MPESA_B2C')}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        M-Pesa
                      </Button>
                      <Button
                        type="button"
                        variant={withdrawMethod === 'MPESA_B2B_PAYBILL' ? 'default' : 'outline'}
                        className={withdrawMethod === 'MPESA_B2B_PAYBILL' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                        onClick={() => setWithdrawMethod('MPESA_B2B_PAYBILL')}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        PayBill
                      </Button>
                      <Button
                        type="button"
                        variant={withdrawMethod === 'MPESA_B2B_TILL' ? 'default' : 'outline'}
                        className={withdrawMethod === 'MPESA_B2B_TILL' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                        onClick={() => setWithdrawMethod('MPESA_B2B_TILL')}
                      >
                        <Building2 className="h-4 w-4 mr-2" />
                        Till
                      </Button>
                      <Button
                        type="button"
                        variant={withdrawMethod === 'BANK' ? 'default' : 'outline'}
                        className={withdrawMethod === 'BANK' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                        onClick={() => setWithdrawMethod('BANK')}
                      >
                        <Landmark className="h-4 w-4 mr-2" />
                        Bank
                      </Button>
                    </div>
                  </div>

                  {/* Amount Field */}
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (KES)</Label>
                    <Input
                      id="amount"
                      type="number"
                      min={withdrawMethod === 'BANK' ? '100' : '200'}
                      max={withdrawMethod === 'BANK' ? '999999' : data.wallet.availableBalance}
                      placeholder="Enter amount"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                    />
                  </div>

                  {/* M-Pesa B2C Fields */}
                  {withdrawMethod === 'MPESA_B2C' && (
                    <div className="space-y-2">
                      <Label htmlFor="phone">M-Pesa Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="e.g. 0712345678"
                        value={withdrawPhone}
                        onChange={(e) => setWithdrawPhone(e.target.value)}
                      />
                      <p className="text-xs text-gray-500">The phone number registered on M-Pesa</p>
                    </div>
                  )}

                  {/* PayBill Fields */}
                  {withdrawMethod === 'MPESA_B2B_PAYBILL' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="paybill">PayBill Number</Label>
                        <Input
                          id="paybill"
                          type="text"
                          placeholder="e.g. 247247"
                          value={paybillNumber}
                          onChange={(e) => setPaybillNumber(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="paybillAccount">Account Number</Label>
                        <Input
                          id="paybillAccount"
                          type="text"
                          placeholder="Your account number"
                          value={paybillAccount}
                          onChange={(e) => setPaybillAccount(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  {/* Till Fields */}
                  {withdrawMethod === 'MPESA_B2B_TILL' && (
                    <div className="space-y-2">
                      <Label htmlFor="till">Till Number</Label>
                      <Input
                        id="till"
                        type="text"
                        placeholder="e.g. 123456"
                        value={tillNumber}
                        onChange={(e) => setTillNumber(e.target.value)}
                      />
                      <p className="text-xs text-gray-500">Lipa Na M-Pesa Buy Goods till number</p>
                    </div>
                  )}

                  {/* Bank Fields */}
                  {withdrawMethod === 'BANK' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="bank">Select Bank</Label>
                        <Select value={bankCode} onValueChange={setBankCode}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your bank" />
                          </SelectTrigger>
                          <SelectContent>
                            {BANK_OPTIONS.map((bank) => (
                              <SelectItem key={bank.code} value={bank.code}>
                                {bank.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankAccount">Account Number</Label>
                        <Input
                          id="bankAccount"
                          type="text"
                          placeholder="Your bank account number"
                          value={bankAccount}
                          onChange={(e) => setBankAccount(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accountName">Account Name</Label>
                        <Input
                          id="accountName"
                          type="text"
                          placeholder="Name on the account"
                          value={accountName}
                          onChange={(e) => setAccountName(e.target.value)}
                        />
                        <p className="text-xs text-gray-500">The name registered with your bank</p>
                      </div>
                    </>
                  )}

                  <Button
                    onClick={handleWithdraw}
                    disabled={isWithdrawing || data.wallet.availableBalance < (withdrawMethod === 'BANK' ? 100 : 200)}
                    className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600"
                  >
                    {isWithdrawing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="mr-2 h-4 w-4" />
                        Withdraw to {withdrawMethod === 'MPESA_B2C' ? 'M-Pesa' : 
                                      withdrawMethod === 'MPESA_B2B_PAYBILL' ? 'PayBill' : 
                                      withdrawMethod === 'MPESA_B2B_TILL' ? 'Till' : 'Bank'}
                      </>
                    )}
                  </Button>

                  {data.wallet.availableBalance < (withdrawMethod === 'BANK' ? 100 : 200) && (
                    <p className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      You need at least KES {withdrawMethod === 'BANK' ? '100' : '200'} to withdraw
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Withdrawal History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {withdrawals.length === 0 ? (
                    <div className="text-center py-8">
                      <ArrowUpRight className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-500 dark:text-gray-400">No withdrawals yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {withdrawals.map((w) => (
                        <div
                          key={w.id}
                          className="flex items-start justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {formatCurrency(w.amount)}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {w.method === 'MPESA_B2C' ? 'M-Pesa' :
                                 w.method === 'MPESA_B2B_PAYBILL' ? 'PayBill' :
                                 w.method === 'MPESA_B2B_TILL' ? 'Till' :
                                 w.method === 'BANK' ? 'Bank' : w.method}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              To: {w.destination}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(w.createdAt).toLocaleDateString('en-KE', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                            {w.mpesaReference && (
                              <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                Ref: {w.mpesaReference}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            {getStatusBadge(w.status)}
                            {w.failedReason && (
                              <div className="text-xs text-red-500 mt-1 max-w-[150px] truncate" title={w.failedReason}>
                                {w.failedReason}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Wallet Settings</CardTitle>
                <CardDescription>
                  Configure your withdrawal preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="defaultPhone">Default M-Pesa Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="defaultPhone"
                      type="tel"
                      placeholder="e.g. 0712345678"
                      value={newMpesaNumber}
                      onChange={(e) => setNewMpesaNumber(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleUpdateSettings}
                      disabled={isUpdatingSettings || !newMpesaNumber}
                    >
                      {isUpdatingSettings ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Save'
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    This number will be pre-filled when you make withdrawals
                  </p>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-4">Account Info</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Wallet ID</span>
                      <div className="font-mono text-gray-900 dark:text-white">
                        {data.wallet.intasendWalletId.slice(0, 8)}...
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Status</span>
                      <div>
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          {data.wallet.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Total Received</span>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(data.wallet.totalReceived)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Total Withdrawn</span>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(data.wallet.totalWithdrawn)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
