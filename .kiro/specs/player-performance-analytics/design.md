# Player Performance Analytics Dashboard - Design Document

## Overview

The Player Performance Analytics Dashboard extends the existing baseball league management system with comprehensive analytics capabilities. It leverages the current data models (Player, PlayerStat, Team, Match) and integrates with existing AI services to provide detailed performance insights, trend analysis, and predictive recommendations.

The system will provide three main user interfaces: a coach dashboard for team-specific analytics, a league administrator dashboard for cross-team comparisons, and a player profile dashboard for individual performance tracking.

## Architecture

### High-Level Architecture

The analytics system follows the existing Rails MVC pattern with additional service layers for complex calculations and AI-powered insights:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Controllers   │    │    Services     │    │     Models      │
│                 │    │                 │    │                 │
│ Analytics       │───▶│ Performance     │───▶│ Player          │
│ Controller      │    │ Analyzer        │    │ PlayerStat      │
│                 │    │                 │    │ Team            │
│ Dashboard       │───▶│ Trend           │───▶│ Match           │
│ Controller      │    │ Calculator      │    │ Season          │
│                 │    │                 │    │                 │
│ Reports         │───▶│ AI Insights     │───▶│ Analytics       │
│ Controller      │    │ Generator       │    │ Models          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow

1. **Data Collection**: Existing PlayerStat records serve as the primary data source
2. **Processing**: Analytics services calculate derived metrics and trends
3. **Storage**: New analytics models store computed results for performance
4. **Presentation**: Controllers serve data to React components for visualization

## Components and Interfaces

### New Models

#### PlayerAnalytics
Stores computed analytics for individual players:
```ruby
class PlayerAnalytics < ApplicationRecord
  belongs_to :player
  belongs_to :season, optional: true
  
  # Batting metrics
  # on_base_percentage, slugging_percentage, ops
  # fielding_percentage, defensive_efficiency
  
  # Trend data
  # performance_trend, consistency_score
  
  # Comparative metrics
  # league_rank, position_rank, team_rank
end
```

#### TeamAnalytics
Extends existing TeamStrengthMetric with player-focused analytics:
```ruby
class TeamAnalytics < ApplicationRecord
  belongs_to :team
  belongs_to :season, optional: true
  
  # Player distribution metrics
  # top_performers, improvement_candidates
  # position_strength_analysis
  
  # Team chemistry metrics
  # lineup_effectiveness, player_synergies
end
```

#### PerformanceReport
Stores generated reports for automated distribution:
```ruby
class PerformanceReport < ApplicationRecord
  belongs_to :reportable, polymorphic: true # Player or Team
  belongs_to :generated_by, class_name: 'User'
  
  # Report metadata
  # report_type, period_start, period_end
  # content (JSON), format, status
end
```

### Service Classes

#### Analytics::PerformanceAnalyzer
Core service for calculating player performance metrics:
```ruby
module Analytics
  class PerformanceAnalyzer
    def analyze_player(player, season: nil)
      # Calculate advanced batting metrics
      # Analyze fielding performance
      # Generate trend analysis
      # Compare to league averages
    end
    
    def analyze_team_players(team, season: nil)
      # Analyze all team players
      # Identify top performers
      # Calculate team chemistry metrics
    end
  end
end
```

#### Analytics::TrendCalculator
Handles trend analysis and predictions:
```ruby
module Analytics
  class TrendCalculator
    def calculate_performance_trend(player, games: 10)
      # Analyze recent performance trajectory
      # Calculate consistency metrics
      # Predict future performance
    end
    
    def identify_breakout_candidates(team)
      # Find players showing improvement
      # Analyze potential for growth
    end
  end
end
```

#### Analytics::InsightsGenerator
AI-powered insights and recommendations:
```ruby
module Analytics
  class InsightsGenerator
    def generate_lineup_recommendations(team, opponent: nil)
      # Analyze optimal batting order
      # Consider matchup advantages
      # Factor in recent form
    end
    
    def generate_player_development_plan(player)
      # Identify improvement areas
      # Suggest training focus
      # Set realistic goals
    end
  end
end
```

### Controllers

#### Analytics::DashboardController
Main analytics dashboard:
```ruby
class Analytics::DashboardController < ApplicationController
  def coach_dashboard
    # Team-specific analytics
    # Player performance summaries
    # Lineup recommendations
  end
  
  def league_dashboard
    # Cross-team comparisons
    # League-wide statistics
    # Competitive balance analysis
  end
  
  def player_dashboard
    # Individual player analytics
    # Personal performance tracking
    # Goal setting and progress
  end
end
```

#### Analytics::ReportsController
Report generation and management:
```ruby
class Analytics::ReportsController < ApplicationController
  def generate
    # Create performance reports
    # Schedule automated reports
    # Manage report distribution
  end
  
  def export
    # Export data in various formats
    # Generate PDF reports
    # Create data visualizations
  end
end
```

### Frontend Components

#### React Components Structure
```
components/
├── analytics/
│   ├── PlayerDashboard.tsx
│   ├── TeamDashboard.tsx
│   ├── LeagueDashboard.tsx
│   ├── PerformanceChart.tsx
│   ├── TrendAnalysis.tsx
│   ├── ComparisonTable.tsx
│   └── InsightsPanel.tsx
├── reports/
│   ├── ReportGenerator.tsx
│   ├── ReportViewer.tsx
│   └── ReportScheduler.tsx
└── shared/
    ├── MetricCard.tsx
    ├── StatChart.tsx
    └── RankingTable.tsx
```

## Data Models

### Enhanced PlayerStat Model
Extend existing model with calculated fields:
```ruby
class PlayerStat < ApplicationRecord
  # Add calculated fields
  def on_base_percentage
    return 0 if at_bats.zero?
    (hits + walks + hit_by_pitch) / (at_bats + walks + hit_by_pitch + sacrifice_flies)
  end
  
  def slugging_percentage
    return 0 if at_bats.zero?
    total_bases / at_bats
  end
  
  def ops
    on_base_percentage + slugging_percentage
  end
end
```

### New Analytics Models Schema
```sql
-- Player Analytics
CREATE TABLE player_analytics (
  id BIGINT PRIMARY KEY,
  player_id BIGINT NOT NULL,
  season_id BIGINT,
  
  -- Advanced batting metrics
  on_base_percentage DECIMAL(5,3),
  slugging_percentage DECIMAL(5,3),
  ops DECIMAL(5,3),
  
  -- Fielding metrics
  fielding_percentage DECIMAL(5,3),
  defensive_efficiency DECIMAL(5,3),
  
  -- Trend metrics
  performance_trend VARCHAR(20),
  consistency_score DECIMAL(5,3),
  
  -- Rankings
  league_rank INTEGER,
  position_rank INTEGER,
  team_rank INTEGER,
  
  -- Metadata
  calculated_at TIMESTAMP,
  games_analyzed INTEGER,
  
  FOREIGN KEY (player_id) REFERENCES players(id),
  FOREIGN KEY (season_id) REFERENCES seasons(id)
);

-- Team Analytics
CREATE TABLE team_analytics (
  id BIGINT PRIMARY KEY,
  team_id BIGINT NOT NULL,
  season_id BIGINT,
  
  -- Player metrics
  top_performers JSON,
  improvement_candidates JSON,
  position_strength_analysis JSON,
  
  -- Team chemistry
  lineup_effectiveness DECIMAL(5,3),
  player_synergies JSON,
  
  -- Metadata
  calculated_at TIMESTAMP,
  
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (season_id) REFERENCES seasons(id)
);

-- Performance Reports
CREATE TABLE performance_reports (
  id BIGINT PRIMARY KEY,
  reportable_type VARCHAR(50),
  reportable_id BIGINT,
  generated_by_id BIGINT,
  
  report_type VARCHAR(50),
  period_start DATE,
  period_end DATE,
  
  content JSON,
  format VARCHAR(20),
  status VARCHAR(20),
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  FOREIGN KEY (generated_by_id) REFERENCES users(id)
);
```

## Error Handling

### Data Validation
- Validate statistical calculations for mathematical correctness
- Handle missing or incomplete player statistics gracefully
- Ensure trend calculations have sufficient data points

### Performance Considerations
- Cache expensive analytics calculations
- Use background jobs for report generation
- Implement pagination for large datasets

### Error Recovery
- Fallback to basic statistics when advanced metrics fail
- Graceful degradation for missing seasonal data
- Clear error messages for insufficient data scenarios

## Testing Strategy

### Unit Tests
- Test all statistical calculations for accuracy
- Verify trend analysis algorithms
- Test edge cases with minimal data

### Integration Tests
- Test full analytics pipeline from data to display
- Verify report generation workflows
- Test multi-tenant data isolation

### Performance Tests
- Load test analytics calculations with large datasets
- Test dashboard response times
- Verify background job processing

### User Acceptance Tests
- Test coach dashboard workflows
- Verify player profile functionality
- Test report generation and distribution

## Implementation Phases

### Phase 1: Core Analytics Engine
- Implement PlayerAnalytics and TeamAnalytics models
- Create PerformanceAnalyzer service
- Build basic statistical calculations

### Phase 2: Dashboard Interfaces
- Develop React components for dashboards
- Implement coach and player views
- Create basic visualization components

### Phase 3: Advanced Features
- Add AI-powered insights
- Implement trend analysis
- Create lineup recommendation system

### Phase 4: Reporting System
- Build report generation engine
- Implement automated report scheduling
- Add export functionality

### Phase 5: Optimization and Polish
- Performance optimization
- Advanced visualizations
- Mobile responsiveness