# AIスケジューラーサービス使用ガイド

このドキュメントでは、草野球リーグマネージャーのAIスケジューラーサービスの使用方法について説明します。

## 概要

AIスケジューラーは、OpenAI APIを活用して以下の機能を提供します：

1. **SmartScheduler** - 総合的なスケジュール最適化
2. **WeatherAwareScheduler** - 天候を考慮したスケジューリング
3. **VenueOptimizer** - 会場の最適配置
4. **RescheduleEngine** - 延期試合の再スケジューリング
5. **ConflictResolver** - スケジュール競合の解決

## 環境設定

使用前に、以下の環境変数を設定してください：

```bash
OPENAI_API_KEY=your_openai_api_key
OPENWEATHER_API_KEY=your_openweather_api_key
```

## 使用例

### 1. SmartScheduler - スケジュール最適化

```ruby
# 組織とシーズンのスケジュールを最適化
scheduler = Ai::SmartScheduler.new(
  organization: organization,
  season: current_season
)

# スケジュール最適化を実行
report = scheduler.optimize_schedule

# 結果を確認
puts report[:japanese_summary]
puts "最適化スコア: #{report[:optimization_score]}"
puts "解決された競合: #{report[:conflicts_resolved]}"

# 個別の試合の再スケジュール提案
match = Match.find(123)
suggestion = scheduler.suggest_reschedule(match, reason: '会場の都合')
puts "推奨日時: #{suggestion[:suggested_date]}"
puts "推奨会場: #{suggestion[:suggested_venue].name}"
```

### 2. WeatherAwareScheduler - 天候考慮スケジューリング

```ruby
weather_scheduler = Ai::WeatherAwareScheduler.new(organization: organization)

# 試合の天候をチェック
match = Match.find(456)
weather_check = weather_scheduler.check_match_weather(match)

if weather_check[:playable]
  puts "試合実施可能（信頼度: #{weather_check[:confidence]}%）"
else
  puts "天候リスクあり: #{weather_check[:reason]}"
end

# シーズン全体の天候レポート生成
season_report = weather_scheduler.generate_seasonal_weather_report(season)
puts season_report[:ai_insights][:summary]

# 天候最適な日程の提案
venue = Venue.find(789)
optimal_dates = weather_scheduler.suggest_weather_optimal_dates(
  venue,
  Date.today,
  Date.today + 30.days
)
```

### 3. VenueOptimizer - 会場最適化

```ruby
venue_optimizer = Ai::VenueOptimizer.new(
  organization: organization,
  season: season
)

# 試合への会場割り当て最適化
matches = season.matches.upcoming
allocation_result = venue_optimizer.optimize_venue_allocation(matches)

puts "割り当て済み: #{allocation_result[:assignments].count}試合"
puts "未割り当て: #{allocation_result[:unassigned].count}試合"
puts allocation_result[:ai_insights][:summary]

# 会場改善提案
improvements = venue_optimizer.suggest_venue_improvements
improvements[:improvements].each do |improvement|
  venue = improvement[:venue]
  puts "#{venue.name}: #{improvement[:recommendation]}"
end

# 移動効率分析
travel_analysis = venue_optimizer.analyze_travel_efficiency
travel_analysis[:recommendations].each do |rec|
  puts "チーム#{rec[:team_id]}: #{rec[:message]}"
end
```

### 4. RescheduleEngine - 試合再スケジューリング

```ruby
reschedule_engine = Ai::RescheduleEngine.new(
  organization: organization,
  season: season
)

# 単一試合の再スケジュール
match = Match.find(321)
result = reschedule_engine.reschedule_match(
  match,
  reason: '雨天中止',
  constraints: {
    earliest_date: Date.today + 3.days,
    preferred_day_of_week: 6 # 土曜日
  }
)

if result[:success]
  puts "新しい日程: #{result[:new_schedule][:datetime]}"
else
  puts "再スケジュール失敗: #{result[:reason]}"
  puts "代替案:"
  result[:alternatives].each do |alt|
    puts "- #{alt[:type]}: #{alt[:slot]}"
  end
end

# 天候による延期処理
weather_data = { reason: '台風接近', confidence: 10 }
postponement_result = reschedule_engine.handle_weather_postponement(match, weather_data)

# シーズン全体の最適化
optimization = reschedule_engine.optimize_season_schedule
puts optimization[:japanese_summary]

# ダブルヘッダーの提案
suggestions = reschedule_engine.suggest_makeup_doubleheader(postponed_match)
suggestions.each do |suggestion|
  puts "日付: #{suggestion[:date]}"
  puts "実現可能性: #{suggestion[:feasibility_score]}"
  puts "AI推奨: #{suggestion[:ai_recommendation][:recommendation]}"
end
```

### 5. ConflictResolver - 競合解決

```ruby
conflict_resolver = Ai::ConflictResolver.new(
  organization: organization,
  season: season
)

# スケジュール競合の分析
matches = season.matches
conflict_analysis = conflict_resolver.analyze_schedule_conflicts(matches)

puts "総競合数: #{conflict_analysis[:total_conflicts]}"
puts "重大な競合: #{conflict_analysis[:critical_conflicts].count}"
puts conflict_analysis[:ai_analysis][:summary]

# 競合の解決
conflicts = ScheduleConflict.pending
resolution_result = conflict_resolver.resolve_conflicts(conflicts)

puts resolution_result[:japanese_summary]
resolution_result[:resolutions].each do |resolution|
  puts "解決: #{resolution[:message]}"
end

# 個別競合の解決戦略提案
conflict = conflicts.first
strategy = conflict_resolver.suggest_resolution_strategy(conflict)
puts "戦略: #{strategy[:strategy]}"
puts "手順:"
strategy[:steps].each_with_index do |step, i|
  puts "#{i + 1}. #{step}"
end

# 解決案の検証
proposed_resolution = {
  venue_change: alternate_venue.id,
  time_change: new_datetime
}
validation = conflict_resolver.validate_resolution(conflict, proposed_resolution)
if validation[:valid]
  puts "解決案は有効です"
else
  puts "問題: #{validation[:issues].join(', ')}"
end
```

## コントローラーでの使用例

```ruby
class Admin::SchedulesController < ApplicationController
  def optimize
    @season = Season.find(params[:id])
    
    # スマートスケジューラーで最適化
    scheduler = Ai::SmartScheduler.new(
      organization: current_organization,
      season: @season
    )
    
    @optimization_report = scheduler.optimize_schedule
    
    # 天候分析を追加
    weather_scheduler = Ai::WeatherAwareScheduler.new(
      organization: current_organization
    )
    @weather_report = weather_scheduler.generate_seasonal_weather_report(@season)
    
    respond_to do |format|
      format.html
      format.json { render json: @optimization_report }
    end
  end
  
  def resolve_conflicts
    @season = Season.find(params[:id])
    
    conflict_resolver = Ai::ConflictResolver.new(
      organization: current_organization,
      season: @season
    )
    
    # 競合を検出して解決
    conflicts = ScheduleConflict.where(season: @season).pending
    @resolution_result = conflict_resolver.resolve_conflicts(conflicts)
    
    flash[:notice] = "#{@resolution_result[:summary][:resolved]}件の競合を解決しました"
    redirect_to admin_season_path(@season)
  end
end
```

## バックグラウンドジョブでの使用

```ruby
class ScheduleOptimizationJob < ApplicationJob
  def perform(season_id)
    season = Season.find(season_id)
    organization = season.organization
    
    # 1. スケジュール最適化
    scheduler = Ai::SmartScheduler.new(
      organization: organization,
      season: season
    )
    optimization_report = scheduler.optimize_schedule
    
    # 2. 天候リスクチェック
    weather_scheduler = Ai::WeatherAwareScheduler.new(
      organization: organization
    )
    weather_alerts = weather_scheduler.monitor_upcoming_matches(days_ahead: 14)
    
    # 3. 必要に応じて再スケジュール
    if weather_alerts.any?
      reschedule_engine = Ai::RescheduleEngine.new(
        organization: organization,
        season: season
      )
      
      weather_alerts.each do |alert|
        if alert[:severity] > 80
          reschedule_engine.handle_weather_postponement(
            alert[:match],
            alert[:weather_check]
          )
        end
      end
    end
    
    # 4. レポートを管理者に送信
    AdminMailer.schedule_optimization_report(
      season,
      optimization_report,
      weather_alerts
    ).deliver_later
  end
end
```

## エラーハンドリング

すべてのAIサービスは、OpenAI APIのエラーを適切に処理します：

```ruby
begin
  scheduler = Ai::SmartScheduler.new(organization: org, season: season)
  report = scheduler.optimize_schedule
rescue => e
  Rails.logger.error "スケジュール最適化エラー: #{e.message}"
  # フォールバック処理
end
```

## パフォーマンス考慮事項

1. **API呼び出しの制限**: OpenAI APIには呼び出し制限があります。大量の処理はバッチ化してください。

2. **キャッシュの活用**: 天候データなどは適切にキャッシュして、API呼び出しを削減してください。

3. **非同期処理**: 時間のかかる最適化処理は、バックグラウンドジョブで実行することを推奨します。

## まとめ

AIスケジューラーサービスは、草野球リーグの運営を大幅に効率化します。各サービスは独立して使用できるため、必要な機能から段階的に導入することが可能です。