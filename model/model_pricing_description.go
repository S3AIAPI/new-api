package model

import (
	"math"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/billing_setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/shopspring/decimal"
)

// ModelPricingDescription describes effective prices without adding persisted
// settings to a preview or snapshot entry.
type ModelPricingDescription struct {
	Effective      PricingValues        `json:"effective,omitempty"`
	CacheWriteMode CacheWriteMode       `json:"cache_write_mode,omitempty"`
	BillingDetails LegacyBillingDetails `json:"billing_details"`
}

type LegacyPricingRule struct {
	Condition  string  `json:"condition"`
	Multiplier float64 `json:"multiplier"`
}

// LegacyBillingDetails contains display-only metadata for supported ratio and
// fixed-request pricing. Absolute audio prices cannot always be represented by
// a ratio: Gemini audio can be billable with a zero text price.
type LegacyBillingDetails struct {
	AudioInputPrice   *float64            `json:"audio_input_price,omitempty"`
	AudioOutputPrice  *float64            `json:"audio_output_price,omitempty"`
	ImageCount        bool                `json:"image_count,omitempty"`
	RequestRules      []LegacyPricingRule `json:"request_rules,omitempty"`
	AudioTextBranches bool                `json:"audio_text_branches,omitempty"`
}

func ResolveLegacyBillingDetails(name string, effective, configured PricingValues) LegacyBillingDetails {
	details := LegacyBillingDetails{}
	if effective["billing_setting.billing_mode"] == billing_setting.BillingModeTieredExpr {
		return details
	}
	if _, fixed := effective["ModelPrice"]; fixed {
		details.ImageCount = common.IsImageGenerationModel(name)
		details.RequestRules = legacyDallePricingRules(name)
		return details
	}
	ratio, priced := effective["ModelRatio"].(float64)
	if !priced || common.QuotaPerUnit <= 0 || math.IsInf(common.QuotaPerUnit, 0) || math.IsNaN(common.QuotaPerUnit) ||
		ratio < 0 || math.IsInf(ratio, 0) || math.IsNaN(ratio) {
		return details
	}
	base := decimal.NewFromFloat(ratio).Mul(decimal.NewFromInt(1_000_000)).Div(decimal.NewFromFloat(common.QuotaPerUnit))
	if price := operation_setting.GetGeminiInputAudioPricePerMillionTokens(name); price > 0 {
		details.AudioInputPrice = &price
		return details
	}
	audioRatio, hasAudio := effective["AudioRatio"].(float64)
	audioCompletionRatio, hasAudioCompletion := effective["AudioCompletionRatio"].(float64)
	if !hasAudio && !hasAudioCompletion {
		return details
	}
	if !hasAudio {
		audioRatio = 1
	}
	if !hasAudioCompletion {
		audioCompletionRatio = 1
	}
	input := base.Mul(decimal.NewFromFloat(audioRatio))
	inPrice, outPrice := input.InexactFloat64(), input.Mul(decimal.NewFromFloat(audioCompletionRatio)).InexactFloat64()
	if math.IsInf(inPrice, 0) || math.IsInf(outPrice, 0) {
		return details
	}
	details.AudioInputPrice, details.AudioOutputPrice = &inPrice, &outPrice
	details.AudioTextBranches = effective["CacheRatio"] != float64(1) || effective["ImageRatio"] != float64(1) || ResolveCacheWriteMode(name, configured) != CacheWriteNone
	return details
}

type CacheWriteMode string

const (
	CacheWriteNone      CacheWriteMode = "none"
	CacheWriteStandard  CacheWriteMode = "standard"
	CacheWriteClaudeTTL CacheWriteMode = "claude_ttl"
)

// ResolveCacheWriteMode describes legacy price display. A generic engine
// fallback is not configured cache-write pricing. Only Claude names inherit the
// dual-TTL rule; other models retain their configured write price.
func ResolveCacheWriteMode(name string, configured PricingValues) CacheWriteMode {
	if strings.Contains(strings.ToLower(name), "claude") {
		return CacheWriteClaudeTTL
	}
	if _, exists := configured["CreateCacheRatio"]; exists {
		return CacheWriteStandard
	}
	return CacheWriteNone
}
