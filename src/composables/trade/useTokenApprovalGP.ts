import { computed, Ref, ref } from 'vue';
import { parseUnits } from '@ethersproject/units';

import { approveTokens } from '@/lib/utils/balancer/tokens';

import { GP_ALLOWANCE_MANAGER_CONTRACT_ADDRESS } from '@/services/gnosis/constants';
import useVueWeb3 from '@/services/web3/useVueWeb3';

import useTokens from '../useTokens';
import useAllowances from '../useAllowances';
import useEthers from '../useEthers';

export default function useTokenApprovalGP(
  tokenInAddress: Ref<string>,
  amount: Ref<string>
) {
  // COMPOSABLES
  const { getProvider } = useVueWeb3();
  const provider = getProvider();
  const { tokens } = useTokens();
  const { txListener: ethersTxListener } = useEthers();

  // DATA
  const approving = ref(false);
  const approved = ref(false);

  // COMPUTED
  const dstList = computed(() => [GP_ALLOWANCE_MANAGER_CONTRACT_ADDRESS]);
  const allowanceTokens = computed(() => [tokenInAddress.value]);
  const {
    getRequiredAllowances,
    isLoading: isLoadingAllowances
  } = useAllowances({
    dstList,
    tokens: allowanceTokens
  });

  const allowanceState = computed(() => {
    if (!tokenInAddress.value || !amount.value || approved.value) {
      return {
        isUnlocked: true
      };
    }

    const tokenInDecimals = tokens.value[tokenInAddress.value].decimals;

    const requiredAllowances = getRequiredAllowances({
      dst: GP_ALLOWANCE_MANAGER_CONTRACT_ADDRESS,
      tokens: [tokenInAddress.value],
      amounts: [parseUnits(amount.value, tokenInDecimals).toString()]
    });

    return {
      isUnlocked: requiredAllowances.length === 0
    };
  });

  // METHODS
  async function approve(): Promise<void> {
    console.log('[TokenApproval] Unlock token for trading on Gnosis Protocol');
    approving.value = true;
    try {
      const [tx] = await approveTokens(
        provider,
        GP_ALLOWANCE_MANAGER_CONTRACT_ADDRESS,
        [tokenInAddress.value]
      );
      ethersTxListener(tx, {
        onTxConfirmed: () => {
          approving.value = false;
          approved.value = true;
        },
        onTxFailed: () => {
          approving.value = false;
        }
      });
    } catch (e) {
      console.log(e);
      approving.value = false;
    }
  }

  const isApproved = computed(() => allowanceState.value.isUnlocked);

  return {
    approving,
    approve,
    allowanceState,
    isApproved,
    isLoading: isLoadingAllowances
  };
}