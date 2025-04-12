
class AiAccountingService
  def initialize(league)
    @league = league
    @client = OpenAI::Client.new
  end

  def generate_financial_report(start_date, end_date)
    financial_data = collect_financial_data(start_date, end_date)

    response = @client.chat(
      parameters: {
        model: "gpt-4",
        messages: [
          { role: "system", content: system_prompt },
          { role: "user", content: user_prompt(financial_data, start_date, end_date) }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      }
    )

    report_data = JSON.parse(response.dig("choices", 0, "message", "content"))
    
    report_data
  end

  def suggest_budget_adjustments
    budget_data = collect_budget_data

    response = @client.chat(
      parameters: {
        model: "gpt-4",
        messages: [
          { role: "system", content: system_prompt },
          { role: "user", content: budget_adjustment_prompt(budget_data) }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      }
    )

    suggestions_data = JSON.parse(response.dig("choices", 0, "message", "content"))
    
    suggestions_data
  end

  private

  def system_prompt
    "You are an AI assistant that helps with financial management for a baseball league. " \
    "Your task is to analyze financial data and provide insights, reports, and suggestions " \
    "to help the league manage its finances effectively. The output should be returned as a JSON object."
  end

  def user_prompt(financial_data, start_date, end_date)
    "Generate a financial report for the #{@league.name} baseball league for the period " \
    "from #{start_date} to #{end_date} based on the following financial data:\n\n" \
    "#{format_financial_data(financial_data)}\n\n" \
    "The report should include:\n" \
    "- Summary of income and expenses\n" \
    "- Breakdown of income by category\n" \
    "- Breakdown of expenses by category\n" \
    "- Net profit/loss\n" \
    "- Comparison with previous period (if available)\n" \
    "- Key financial metrics\n" \
    "- Recommendations for financial management\n\n" \
    "Return the report as a JSON object with appropriate sections and data."
  end

  def budget_adjustment_prompt(budget_data)
    "Analyze the current budget for the #{@league.name} baseball league and suggest " \
    "adjustments to optimize financial performance based on the following data:\n\n" \
    "#{format_budget_data(budget_data)}\n\n" \
    "Your suggestions should include:\n" \
    "- Areas where spending can be reduced\n" \
    "- Opportunities for increasing revenue\n" \
    "- Reallocation of resources for better ROI\n" \
    "- Long-term financial planning recommendations\n" \
    "- Risk management strategies\n\n" \
    "Return the suggestions as a JSON object with appropriate sections and data."
  end

  def collect_financial_data(start_date, end_date)
    {
      income: {
        registration_fees: @league.payments.successful.where(
          created_at: start_date..end_date,
          payable_type: 'LeagueRegistration'
        ).sum(:amount),
        game_fees: @league.payments.successful.where(
          created_at: start_date..end_date,
          payable_type: 'Game'
        ).sum(:amount),
        sponsorships: @league.payments.successful.where(
          created_at: start_date..end_date,
          payable_type: 'Sponsorship'
        ).sum(:amount),
        merchandise: @league.payments.successful.where(
          created_at: start_date..end_date,
          payable_type: 'MerchandiseSale'
        ).sum(:amount),
        other: @league.payments.successful.where(
          created_at: start_date..end_date
        ).where.not(
          payable_type: ['LeagueRegistration', 'Game', 'Sponsorship', 'MerchandiseSale']
        ).sum(:amount)
      },
      expenses: {
        venue_rentals: @league.expenses.where(
          created_at: start_date..end_date,
          category: 'venue_rental'
        ).sum(:amount),
        equipment: @league.expenses.where(
          created_at: start_date..end_date,
          category: 'equipment'
        ).sum(:amount),
        umpire_fees: @league.expenses.where(
          created_at: start_date..end_date,
          category: 'umpire_fee'
        ).sum(:amount),
        insurance: @league.expenses.where(
          created_at: start_date..end_date,
          category: 'insurance'
        ).sum(:amount),
        awards: @league.expenses.where(
          created_at: start_date..end_date,
          category: 'award'
        ).sum(:amount),
        administrative: @league.expenses.where(
          created_at: start_date..end_date,
          category: 'administrative'
        ).sum(:amount),
        other: @league.expenses.where(
          created_at: start_date..end_date
        ).where.not(
          category: ['venue_rental', 'equipment', 'umpire_fee', 'insurance', 'award', 'administrative']
        ).sum(:amount)
      }
    }
  end

  def collect_budget_data
    current_fiscal_year = Date.current.year
    
    {
      budget: {
        income: {
          registration_fees: @league.budget_items.where(fiscal_year: current_fiscal_year, category: 'income', subcategory: 'registration_fees').sum(:amount),
          game_fees: @league.budget_items.where(fiscal_year: current_fiscal_year, category: 'income', subcategory: 'game_fees').sum(:amount),
          sponsorships: @league.budget_items.where(fiscal_year: current_fiscal_year, category: 'income', subcategory: 'sponsorships').sum(:amount),
          merchandise: @league.budget_items.where(fiscal_year: current_fiscal_year, category: 'income', subcategory: 'merchandise').sum(:amount),
          other: @league.budget_items.where(fiscal_year: current_fiscal_year, category: 'income').where.not(subcategory: ['registration_fees', 'game_fees', 'sponsorships', 'merchandise']).sum(:amount)
        },
        expenses: {
          venue_rentals: @league.budget_items.where(fiscal_year: current_fiscal_year, category: 'expense', subcategory: 'venue_rental').sum(:amount),
          equipment: @league.budget_items.where(fiscal_year: current_fiscal_year, category: 'expense', subcategory: 'equipment').sum(:amount),
          umpire_fees: @league.budget_items.where(fiscal_year: current_fiscal_year, category: 'expense', subcategory: 'umpire_fee').sum(:amount),
          insurance: @league.budget_items.where(fiscal_year: current_fiscal_year, category: 'expense', subcategory: 'insurance').sum(:amount),
          awards: @league.budget_items.where(fiscal_year: current_fiscal_year, category: 'expense', subcategory: 'award').sum(:amount),
          administrative: @league.budget_items.where(fiscal_year: current_fiscal_year, category: 'expense', subcategory: 'administrative').sum(:amount),
          other: @league.budget_items.where(fiscal_year: current_fiscal_year, category: 'expense').where.not(subcategory: ['venue_rental', 'equipment', 'umpire_fee', 'insurance', 'award', 'administrative']).sum(:amount)
        }
      },
      actual: {
        income: {
          registration_fees: @league.payments.successful.where(created_at: Date.new(current_fiscal_year, 1, 1)..Date.current, payable_type: 'LeagueRegistration').sum(:amount),
          game_fees: @league.payments.successful.where(created_at: Date.new(current_fiscal_year, 1, 1)..Date.current, payable_type: 'Game').sum(:amount),
          sponsorships: @league.payments.successful.where(created_at: Date.new(current_fiscal_year, 1, 1)..Date.current, payable_type: 'Sponsorship').sum(:amount),
          merchandise: @league.payments.successful.where(created_at: Date.new(current_fiscal_year, 1, 1)..Date.current, payable_type: 'MerchandiseSale').sum(:amount),
          other: @league.payments.successful.where(created_at: Date.new(current_fiscal_year, 1, 1)..Date.current).where.not(payable_type: ['LeagueRegistration', 'Game', 'Sponsorship', 'MerchandiseSale']).sum(:amount)
        },
        expenses: {
          venue_rentals: @league.expenses.where(created_at: Date.new(current_fiscal_year, 1, 1)..Date.current, category: 'venue_rental').sum(:amount),
          equipment: @league.expenses.where(created_at: Date.new(current_fiscal_year, 1, 1)..Date.current, category: 'equipment').sum(:amount),
          umpire_fees: @league.expenses.where(created_at: Date.new(current_fiscal_year, 1, 1)..Date.current, category: 'umpire_fee').sum(:amount),
          insurance: @league.expenses.where(created_at: Date.new(current_fiscal_year, 1, 1)..Date.current, category: 'insurance').sum(:amount),
          awards: @league.expenses.where(created_at: Date.new(current_fiscal_year, 1, 1)..Date.current, category: 'award').sum(:amount),
          administrative: @league.expenses.where(created_at: Date.new(current_fiscal_year, 1, 1)..Date.current, category: 'administrative').sum(:amount),
          other: @league.expenses.where(created_at: Date.new(current_fiscal_year, 1, 1)..Date.current).where.not(category: ['venue_rental', 'equipment', 'umpire_fee', 'insurance', 'award', 'administrative']).sum(:amount)
        }
      }
    }
  end

  def format_financial_data(financial_data)
    "Income:\n" \
    "- Registration Fees: $#{financial_data[:income][:registration_fees]}\n" \
    "- Game Fees: $#{financial_data[:income][:game_fees]}\n" \
    "- Sponsorships: $#{financial_data[:income][:sponsorships]}\n" \
    "- Merchandise: $#{financial_data[:income][:merchandise]}\n" \
    "- Other: $#{financial_data[:income][:other]}\n" \
    "- Total Income: $#{financial_data[:income].values.sum}\n\n" \
    "Expenses:\n" \
    "- Venue Rentals: $#{financial_data[:expenses][:venue_rentals]}\n" \
    "- Equipment: $#{financial_data[:expenses][:equipment]}\n" \
    "- Umpire Fees: $#{financial_data[:expenses][:umpire_fees]}\n" \
    "- Insurance: $#{financial_data[:expenses][:insurance]}\n" \
    "- Awards: $#{financial_data[:expenses][:awards]}\n" \
    "- Administrative: $#{financial_data[:expenses][:administrative]}\n" \
    "- Other: $#{financial_data[:expenses][:other]}\n" \
    "- Total Expenses: $#{financial_data[:expenses].values.sum}\n\n" \
    "Net Profit/Loss: $#{financial_data[:income].values.sum - financial_data[:expenses].values.sum}"
  end

  def format_budget_data(budget_data)
    "Budget vs. Actual (Current Fiscal Year):\n\n" \
    "Income:\n" \
    "- Registration Fees: Budget $#{budget_data[:budget][:income][:registration_fees]} | Actual $#{budget_data[:actual][:income][:registration_fees]}\n" \
    "- Game Fees: Budget $#{budget_data[:budget][:income][:game_fees]} | Actual $#{budget_data[:actual][:income][:game_fees]}\n" \
    "- Sponsorships: Budget $#{budget_data[:budget][:income][:sponsorships]} | Actual $#{budget_data[:actual][:income][:sponsorships]}\n" \
    "- Merchandise: Budget $#{budget_data[:budget][:income][:merchandise]} | Actual $#{budget_data[:actual][:income][:merchandise]}\n" \
    "- Other: Budget $#{budget_data[:budget][:income][:other]} | Actual $#{budget_data[:actual][:income][:other]}\n" \
    "- Total Income: Budget $#{budget_data[:budget][:income].values.sum} | Actual $#{budget_data[:actual][:income].values.sum}\n\n" \
    "Expenses:\n" \
    "- Venue Rentals: Budget $#{budget_data[:budget][:expenses][:venue_rentals]} | Actual $#{budget_data[:actual][:expenses][:venue_rentals]}\n" \
    "- Equipment: Budget $#{budget_data[:budget][:expenses][:equipment]} | Actual $#{budget_data[:actual][:expenses][:equipment]}\n" \
    "- Umpire Fees: Budget $#{budget_data[:budget][:expenses][:umpire_fees]} | Actual $#{budget_data[:actual][:expenses][:umpire_fees]}\n" \
    "- Insurance: Budget $#{budget_data[:budget][:expenses][:insurance]} | Actual $#{budget_data[:actual][:expenses][:insurance]}\n" \
    "- Awards: Budget $#{budget_data[:budget][:expenses][:awards]} | Actual $#{budget_data[:actual][:expenses][:awards]}\n" \
    "- Administrative: Budget $#{budget_data[:budget][:expenses][:administrative]} | Actual $#{budget_data[:actual][:expenses][:administrative]}\n" \
    "- Other: Budget $#{budget_data[:budget][:expenses][:other]} | Actual $#{budget_data[:actual][:expenses][:other]}\n" \
    "- Total Expenses: Budget $#{budget_data[:budget][:expenses].values.sum} | Actual $#{budget_data[:actual][:expenses].values.sum}\n\n" \
    "Net Profit/Loss: Budget $#{budget_data[:budget][:income].values.sum - budget_data[:budget][:expenses].values.sum} | " \
    "Actual $#{budget_data[:actual][:income].values.sum - budget_data[:actual][:expenses].values.sum}"
  end
end
