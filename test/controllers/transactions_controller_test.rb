require "test_helper"

class TransactionsControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get transactions_index_url
    assert_response :success
  end

  test "should get show" do
    get transactions_show_url
    assert_response :success
  end

  test "should get new" do
    get transactions_new_url
    assert_response :success
  end

  test "should get create" do
    get transactions_create_url
    assert_response :success
  end

  test "should get process_payment" do
    get transactions_process_payment_url
    assert_response :success
  end

  test "should get invoice" do
    get transactions_invoice_url
    assert_response :success
  end

  test "should get payment_history" do
    get transactions_payment_history_url
    assert_response :success
  end
end
